/// <reference lib="deno.ns" />
import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);

  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

Deno.serve(async (req: Request) => {
  console.log("LABORES API INICIADA");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response({ error: "Método no permitido" }, 405);
  }

  try {
    // 1. Verificar sesión
    const authorization = req.headers.get("Authorization") ?? "";

    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!token) {
      return response({ error: "Sesión no proporcionada" }, 401);
    }

    const parts = token.split(".");

    if (parts.length !== 2) {
      return response({ error: "Sesión inválida" }, 401);
    }

    const [payloadBase64, signatureBase64] = parts;

    const sessionSecret = Deno.env.get("LABORES_SESSION_SECRET");

    if (!sessionSecret) {
      return response(
        { error: "Falta configurar el secreto de sesión" },
        500,
      );
    }

    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(sessionSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    // Copias con ArrayBuffer para evitar incompatibilidad de tipos.
    const signatureBytes = decodeBase64Url(signatureBase64);
    const payloadBytes = encoder.encode(payloadBase64);

    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      payloadBytes,
    );

    if (!validSignature) {
      return response({ error: "Firma de sesión inválida" }, 401);
    }

    // 2. Leer información de la sesión
    let payload: {
      role?: string;
      supervisorId?: string | null;
      iat?: number;
      exp?: number;
    };

    try {
      payload = JSON.parse(
        new TextDecoder().decode(decodeBase64Url(payloadBase64)),
      );
    } catch {
      return response({ error: "Contenido de sesión inválido" }, 401);
    }

    const now = Math.floor(Date.now() / 1000);

    if (
      typeof payload.exp !== "number" ||
      payload.exp <= now ||
      typeof payload.iat !== "number" ||
      payload.iat > now + 60
    ) {
      return response({ error: "La sesión ha caducado" }, 401);
    }

    if (
      payload.role !== "administrador" &&
      payload.role !== "supervisor"
    ) {
      return response({ error: "Rol no válido" }, 403);
    }

    if (
      payload.role === "supervisor" &&
      (typeof payload.supervisorId !== "string" ||
        !payload.supervisorId.trim())
    ) {
      return response({ error: "Supervisor no válido" }, 403);
    }

    // 3. Leer operación solicitada
    const body = await req.json();

    const { action, id, nombre } = body;

    // 4. Por ahora, estas operaciones son exclusivas del administrador.
    if (payload.role !== "administrador") {
      return response(
        { error: "No tienes permisos para administrar supervisores" },
        403,
      );
    }

    // 5. Conectar con Supabase desde el servidor
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const databaseSecret = Deno.env.get("LABORES_DB_SECRET");

    if (!supabaseUrl || !databaseSecret) {
      console.error("Falta configuración de la base de datos");

      return response(
        { error: "Error de configuración del servidor" },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, databaseSecret, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // 6. Consultar supervisores
    if (action === "supervisores.list") {
      const { data, error } = await supabase
        .from("supervisores")
        .select("id, nombre")
        .order("nombre");

      if (error) {
        console.error("Error consultando supervisores:", error.message);

        return response(
          { error: "No se pudo consultar la lista" },
          500,
        );
      }

      return response({
        success: true,
        supervisores: data,
      });
    }

    // 7. Agregar supervisor
    if (action === "supervisores.create") {
      if (typeof nombre !== "string" || !nombre.trim()) {
        return response(
          { error: "Ingresa el nombre del supervisor" },
          400,
        );
      }

      const nombreLimpio = nombre.trim();

      const { data: existente, error: consultaError } = await supabase
        .from("supervisores")
        .select("id")
        .eq("nombre", nombreLimpio)
        .limit(1);

      if (consultaError) {
        return response(
          { error: "No se pudo validar el nombre" },
          500,
        );
      }

      if (existente && existente.length > 0) {
        return response(
          { error: "Ese supervisor ya está registrado" },
          409,
        );
      }

      const { data, error } = await supabase
        .from("supervisores")
        .insert({
  id: typeof id === "string" && id.trim()
    ? id.trim()
    : `supervisor-${crypto.randomUUID()}`,
  nombre: nombreLimpio,
})
        .select("id, nombre")
        .single();

      if (error) {
        console.error("Error creando supervisor:", error.message);

        return response(
          { error: "No se pudo agregar el supervisor" },
          500,
        );
      }

      return response(
        { success: true, supervisor: data },
        201,
      );
    }

    // 8. Modificar supervisor
    if (action === "supervisores.update") {
      if (
        typeof id !== "string" ||
        !id.trim() ||
        typeof nombre !== "string" ||
        !nombre.trim()
      ) {
        return response(
          { error: "Faltan el ID o el nombre" },
          400,
        );
      }

      const { data, error } = await supabase
        .from("supervisores")
        .update({ nombre: nombre.trim() })
        .eq("id", id)
        .select("id, nombre")
        .maybeSingle();

      if (error) {
        return response(
          { error: "No se pudo modificar el supervisor" },
          500,
        );
      }

      if (!data) {
        return response(
          { error: "Supervisor no encontrado" },
          404,
        );
      }

      return response({
        success: true,
        supervisor: data,
      });
    }

    // 9. Eliminar supervisor
    if (action === "supervisores.delete") {
      if (typeof id !== "string" || !id.trim()) {
        return response(
          { error: "Falta el ID del supervisor" },
          400,
        );
      }

      const { data, error } = await supabase
        .from("supervisores")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Error eliminando supervisor:", error.message);

        return response(
          { error: "No se pudo eliminar el supervisor" },
          500,
        );
      }

      if (!data) {
        return response(
          { error: "Supervisor no encontrado" },
          404,
        );
      }

      return response({
        success: true,
        message: "Supervisor eliminado",
      });
    }

    return response(
      { error: "Operación no reconocida" },
      400,
    );

  } catch (error) {
    console.error("Error en labores-api:", error);

    return response(
      { error: "Error interno del servidor" },
      500,
    );
  }
});
