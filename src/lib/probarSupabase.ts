
import { supabase } from './supabase'

export async function probarConexionSupabase() {
  console.log('Iniciando prueba de Supabase...')

  try {
    const { data, error } = await supabase
      .from('areas')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Error de Supabase:', error.message)
      return false
    }

    console.log('Conexión con Supabase correcta:', data)
    return true
  } catch (error) {
    console.error('Error inesperado:', error)
    return false
  }
}
