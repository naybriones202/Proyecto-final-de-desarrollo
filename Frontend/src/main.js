const API = 'http://localhost:3000';

// Elementos Globales
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');

// --- LOGIN ---
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cedula = document.getElementById('login-cedula').value;
  const clave = document.getElementById('login-clave').value;

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula, clave })
    });
    const data = await res.json();

    if (res.ok) {
      Swal.fire({ icon: 'success', title: 'Bienvenido', text: data.usuario.nombre, timer: 1000, showConfirmButton: false });
      document.getElementById('usuario-logueado').innerText = data.usuario.nombre;
      
      // Ocultar Login y Mostrar Dashboard
      loginSection.classList.add('oculto');
      loginSection.classList.remove('d-flex');
      dashboardSection.classList.remove('oculto');
      dashboardSection.classList.add('d-flex');
      
      // Asegurar que inicie en el primer panel
      mostrarPanel('usuarios');
      
      // Cargar datos
      cargarUsuarios();
      cargarMaterias();
      cargarEstudiantes(); 
      cargarNotas();
    } else {
      Swal.fire('Error', data.msg, 'error');
    }
  } catch (error) { Swal.fire('Error', 'Sin conexión', 'error'); }
});

document.getElementById('btn-logout').addEventListener('click', () => location.reload());

// --- NAVEGACIÓN (Esto arregla que todo se vea de golpe) ---
window.mostrarPanel = (panel) => {
    // 1. Ocultar todos los paneles
    const paneles = ['usuarios', 'materias', 'estudiantes', 'notas'];
    paneles.forEach(p => {
        document.getElementById(`panel-${p}`).classList.add('oculto');
        
        // Desactivar botón
        const btn = document.getElementById(`btn-nav-${p}`);
        if(btn) {
            btn.classList.remove('active', 'text-white');
            btn.classList.add('text-white-50');
        }
    });

    // 2. Mostrar el panel seleccionado
    document.getElementById(`panel-${panel}`).classList.remove('oculto');
    
    // 3. Activar botón correspondiente
    const btnActivo = document.getElementById(`btn-nav-${panel}`);
    if(btnActivo) {
        btnActivo.classList.add('active', 'text-white');
        btnActivo.classList.remove('text-white-50');
    }

    // 4. Cambiar título
    const titulos = {
        'usuarios': 'Gestión de Usuarios',
        'materias': 'Gestión de Materias',
        'estudiantes': 'Directorio de Estudiantes',
        'notas': 'Registro de Calificaciones'
    };
    const tituloEl = document.getElementById('titulo-seccion');
    if(tituloEl) tituloEl.innerText = titulos[panel] || 'Panel';

    // Recargar datos frescos
    if(panel === 'estudiantes') cargarEstudiantes();
    if(panel === 'notas') { cargarEstudiantes(); cargarMaterias(); cargarNotas(); }
};

// --- USUARIOS ---
async function cargarUsuarios() {
  const res = await fetch(`${API}/usuarios`);
  const usuarios = await res.json();
  const tabla = document.getElementById('tabla-usuarios-body');
  tabla.innerHTML = '';
  usuarios.forEach(u => {
    tabla.innerHTML += `<tr>
        <td class="ps-4 fw-bold text-muted">#${u.id}</td>
        <td>${u.cedula}</td>
        <td>${u.nombre}</td>
        <td class="text-end pe-4">
          <button class="btn btn-sm btn-outline-primary" onclick="editarUsuario('${u.id}','${u.cedula}','${u.nombre}','${u.clave}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="borrarUsuario('${u.id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
  });
}

document.getElementById('form-usuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('user-id').value;
    const body = JSON.stringify({
        cedula: document.getElementById('user-cedula').value,
        nombre: document.getElementById('user-nombre').value,
        clave: document.getElementById('user-clave').value
    });
    const url = id ? `${API}/usuarios/${id}` : `${API}/usuarios`;
    const method = id ? 'PUT' : 'POST';
    
    await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body });
    Swal.fire('Listo', 'Usuario guardado', 'success');
    window.limpiarFormUsuario();
    cargarUsuarios();
});

window.borrarUsuario = async (id) => {
    if(confirm('¿Eliminar usuario?')) {
        await fetch(`${API}/usuarios/${id}`, { method: 'DELETE' });
        cargarUsuarios();
    }
};

window.editarUsuario = (id, c, n, cl) => {
    document.getElementById('user-id').value = id;
    document.getElementById('user-cedula').value = c;
    document.getElementById('user-nombre').value = n;
    document.getElementById('user-clave').value = cl;
    document.getElementById('titulo-form-usuario').innerText = "Editar Usuario #" + id;
};

window.limpiarFormUsuario = () => {
    document.getElementById('form-usuario').reset();
    document.getElementById('user-id').value = '';
    document.getElementById('titulo-form-usuario').innerText = "Nuevo Usuario";
};

// --- MATERIAS ---
async function cargarMaterias() {
  const res = await fetch(`${API}/materias`);
  const materias = await res.json();
  const tabla = document.getElementById('tabla-materias-body');
  const selectMateria = document.getElementById('nota-materia'); 
  
  tabla.innerHTML = '';
  selectMateria.innerHTML = '<option value="">Seleccione Materia...</option>';

  materias.forEach(m => {
    tabla.innerHTML += `<tr>
        <td class="ps-4 fw-bold text-muted">#${m.id}</td>
        <td>${m.codigo}</td>
        <td>${m.nombre}</td>
        <td class="text-end pe-4"><button class="btn btn-sm btn-outline-danger" onclick="borrarMateria('${m.id}')"><i class="bi bi-trash"></i></button></td>
    </tr>`;
    selectMateria.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
  });
}

document.getElementById('form-materia').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch(`${API}/materias`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            codigo: document.getElementById('materia-codigo').value,
            nombre: document.getElementById('materia-nombre').value
        })
    });
    Swal.fire('Listo', 'Materia guardada', 'success');
    document.getElementById('form-materia').reset();
    cargarMaterias();
});

window.borrarMateria = async (id) => {
    if(confirm('¿Eliminar materia?')) {
        await fetch(`${API}/materias/${id}`, { method: 'DELETE' });
        cargarMaterias();
    }
};

window.limpiarFormMateria = () => {
    document.getElementById('form-materia').reset();
    document.getElementById('materia-id').value = '';
    document.getElementById('titulo-form-materia').innerHTML = '<i class="bi bi-book-half"></i> Nueva Materia';
}

// --- ESTUDIANTES ---
async function cargarEstudiantes() {
  const res = await fetch(`${API}/estudiantes`);
  const estudiantes = await res.json();
  const tabla = document.getElementById('tabla-estudiantes-body');
  const selectEst = document.getElementById('nota-estudiante'); 
  
  tabla.innerHTML = '';
  selectEst.innerHTML = '<option value="">Seleccione Estudiante...</option>';

  estudiantes.forEach(e => {
    tabla.innerHTML += `<tr>
        <td class="ps-4 fw-bold text-muted">#${e.id}</td>
        <td>${e.cedula}</td>
        <td>${e.nombre}</td>
        <td class="text-end pe-4"><button class="btn btn-sm btn-outline-danger" onclick="borrarEstudiante('${e.id}')"><i class="bi bi-trash"></i></button></td>
    </tr>`;
    selectEst.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
  });
}

document.getElementById('form-estudiante').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch(`${API}/estudiantes`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            cedula: document.getElementById('est-cedula').value,
            nombre: document.getElementById('est-nombre').value
        })
    });
    Swal.fire('Listo', 'Estudiante registrado', 'success');
    document.getElementById('form-estudiante').reset();
    cargarEstudiantes();
});

window.borrarEstudiante = async (id) => {
    if(confirm('¿Eliminar estudiante?')) {
        await fetch(`${API}/estudiantes/${id}`, { method: 'DELETE' });
        cargarEstudiantes();
    }
};

window.limpiarFormEstudiante = () => {
    document.getElementById('form-estudiante').reset();
}

// --- NOTAS (Con botón Eliminar) ---
async function cargarNotas() {
    const res = await fetch(`${API}/notas`);
    const notas = await res.json();
    const tabla = document.getElementById('tabla-notas-body');
    tabla.innerHTML = ''; 
    
    notas.forEach(n => {
        tabla.innerHTML += `
        <tr>
            <td class="ps-4 fw-bold text-muted">${n.estudiante}</td>
            <td>${n.materia}</td>
            <td><span class="badge bg-warning text-dark fs-6">${n.valor}</span></td>
            
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-danger" onclick="borrarNota('${n.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>`;
    });
}

// LÓGICA PARA BORRAR NOTAS
window.borrarNota = async (id) => {
    const result = await Swal.fire({
        title: '¿Eliminar calificación?',
        text: "Se borrará la nota de este estudiante.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, borrar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`${API}/notas/${id}`, { method: 'DELETE' });
            if (res.ok) {
                Swal.fire('Eliminado', 'La nota ha sido eliminada.', 'success');
                cargarNotas();
            } else {
                Swal.fire('Error', 'No se pudo eliminar', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Fallo de conexión', 'error');
        }
    }
};

document.getElementById('form-notas').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/notas`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            estudiante_id: document.getElementById('nota-estudiante').value,
            materia_id: document.getElementById('nota-materia').value,
            valor: document.getElementById('nota-valor').value
        })
    });
    
    if(res.ok) {
        Swal.fire('Guardado', 'Calificación asignada', 'success');
        document.getElementById('nota-valor').value = '';
        cargarNotas();
    } else {
        Swal.fire('Error', 'No se pudo guardar', 'error');
    }
});

window.limpiarFormNotas = () => {
    document.getElementById('form-notas').reset();
}