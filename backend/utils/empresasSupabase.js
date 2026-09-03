// js/empresas-supabase.js
class EmpresasSupabase {
    constructor() {
        // Verificar que supabaseClient existe
        if (typeof supabaseClient === 'undefined') {
            console.error('❌ supabaseClient no está definido. ¿Cargaste supabase-config.js?');
        }
        
        this.supabase = supabaseClient;
       
        this.tabla = 'empresa'; 
        
        console.log('✅ empresasDB inicializado correctamente');
        console.log('📁 Tabla configurada:', this.tabla);
    }
    
    async obtenerEmpresas() {
        try {
            console.log(`🔍 Buscando empresas en tabla: "${this.tabla}"`);
            
            const { data, error, count } = await this.supabase
                .from(this.tabla)
                .select('*', { count: 'exact' });
            
            if (error) {
                console.error('❌ Error de Supabase:');
                console.error('  - Mensaje:', error.message);
                console.error('  - Código:', error.code);
                console.error('  - Detalles:', error.details);
                throw error;
            }
            
            console.log(`✅ ${data?.length || 0} empresas cargadas desde Supabase`);
            
            if (data && data.length > 0) {
                console.log('📊 Primera empresa:', data[0]);
            } else {
                console.log('⚠️ No hay datos en la tabla. Verifica:');
                console.log('   1. Que la tabla tenga datos');
                console.log('   2. Que las políticas RLS permitan lectura');
                console.log('   3. Que el nombre de la tabla sea correcto');
            }
            
            return { success: true, data: data || [], total: data?.length || 0 };
            
        } catch (error) {
            console.error('❌ Error al obtener empresas:', error);
            return { success: false, error: error.message, data: [] };
        }
    }
    
    async obtenerEmpresaPorId(id) {
        try {
            const { data, error } = await this.supabase
                .from(this.tabla)
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            
            return { success: true, data: data };
            
        } catch (error) {
            console.error('Error al obtener empresa:', error);
            return { success: false, error: error.message };
        }
    }
}

// Crear instancia global
const empresasDB = new EmpresasSupabase();