document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // 1. Cargar datos del Usuario (LocalStorage)
    document.getElementById('owner-name').value = user.nombre || '';
    document.getElementById('owner-phone').value = user.telefono || '';
    if (user.foto_url) {
        document.getElementById('preview-photo').style.backgroundImage = `url('${user.foto_url}')`;
    }

    // 2. Cargar datos de la Empresa (API) si existe
    if (user.idempresa) {
        try {
            const response = await fetch(`/api/negocio/${user.idempresa}`);
            const result = await response.json();
            
            if (result.status === 'ok') {
                const biz = result.data;
                document.getElementById('biz-name').value = biz.nombre || '';
                document.getElementById('biz-phone').value = biz.telefono || '';
                document.getElementById('biz-address').value = biz.direccion || '';
                document.getElementById('biz-city').value = biz.ciudad || '';
                document.getElementById('biz-state').value = biz.estado || '';
                document.getElementById('biz-country').value = biz.pais || '';
            }
        } catch (error) {
            console.error("Error cargando datos de empresa:", error);
        }
    }
});

// Evento Guardar
document.getElementById('btn-save-all').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-all');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Deshabilitar botón
    btn.textContent = "Cargando...";
    btn.disabled = true;

    // Recolectar datos
    const payload = {
        idEmpleado: user.idempleado,
        idEmpresa: user.idempresa, // Puede ser null
        nombreDueno: document.getElementById('owner-name').value,
        telefonoDueno: document.getElementById('owner-phone').value,
        nombreBiz: document.getElementById('biz-name').value,
        telefonoBiz: document.getElementById('biz-phone').value,
        direccion: document.getElementById('biz-address').value,
        ciudad: document.getElementById('biz-city').value,
        estado: document.getElementById('biz-state').value,
        pais: document.getElementById('biz-country').value
    };

    try {
        const response = await fetch('/api/negocio/configurar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === 'success') {
            // Actualizar localstorage con los nuevos datos del usuario y la empresa creada
            const updatedUser = { ...user, ...result.data.user, idempresa: result.data.idEmpresa };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            alert("¡Configuración actualizada con éxito!");
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error de conexión con el servidor");
    } finally {
        btn.textContent = "Guardar";
        btn.disabled = false;
    }
});