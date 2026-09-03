import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrarEmpleados() {

  // 1. Obtener empleados
  const { data: empleados, error } = await supabase
    .from('empleado')
    .select('*');

  if (error) {
    console.error('Error al obtener empleados:', error);
    return;
  }

  console.log('Empleados encontrados:', empleados.length);

  for (const emp of empleados) {

    try {

      // 1. Crear usuario
      const { data, error } = await supabase.auth.admin.createUser({
        email: emp.correo,
        password: emp.contrasenia,
        email_confirm: true
      });

      if (error) {
        if (error.message.includes('already')) {
            console.log(`Usuario ya existe: ${emp.correo}`);
            continue; // saltar a siguiente iteración
        }

        console.error(`Error con ${emp.correo}:`, error.message);
        continue;
      }

      const userId = data.user.id;

      console.log(`Usuario creado: ${emp.correo}`);

      // 2. Guardar user_id
      const { error: updateError } = await supabase
        .from('empleado')
        .update({ user_id: userId })
        .eq('idempleado', emp.idempleado);

      if (updateError) {
        console.error(`Error actualizando ${emp.correo}:`, updateError.message);
      }

    } catch (err) {
      console.error('Error inesperado:', err);
    }
  }
}

migrarEmpleados();