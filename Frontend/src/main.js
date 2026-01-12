// ===============================
// CONFIGURACIÓN
// ===============================
import "bootstrap/dist/css/bootstrap.min.css";

const API_URL = "http://localhost:3000";


// ===============================
// ESTADO GLOBAL
// ===============================
let usuariosLista = [];
let materiasLista = [];
let usuarioLogueado = null;

// ===============================
// ELEMENTOS DOM
// ===============================
const vistaLogin = document.getElementById("vistaLogin");
const vistaDashboard = document.getElementById("vistaDashboard");

const tablaUsuarios = document.getElementById("tablaUsuarios");
const tablaMaterias = document.getElementById("tablaMaterias");

const inputBuscar = document.getElementById("inputBuscar");
const btnSalir = document.getElementById("btnSalir");

// ===============================
// INICIO AUTOMÁTICO
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const guardado = localStorage.getItem("usuario");
  if (guardado) {
    iniciarSesion(JSON.parse(guardado));
  }
});

// ===============================
// LOGIN
// ===============================
const formLogin = document.getElementById("formLogin");

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cedula = document.getElementById("loginCedula").value;
  const clave = document.getElementById("loginClave").value;
  const error = document.getElementById("loginError");

  try {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cedula, clave })
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ msg: "Error en servidor" }));
    error.textContent = errorData.msg || "Error al iniciar sesión";
    return;
  }

  const data = await res.json();
  localStorage.setItem("usuario", JSON.stringify(data.usuario));
  iniciarSesion(data.usuario);

} catch (err) {
  console.error(err);
  error.textContent = "Error de conexión con el servidor";
}

});

// ===============================
// SESIÓN
// ===============================
function iniciarSesion(usuario) {
  usuarioLogueado = usuario;

  vistaLogin.classList.add("d-none");
  vistaDashboard.classList.remove("d-none");

  aplicarRoles();

  cargarUsuarios();
  cargarMaterias();
}

btnSalir.addEventListener("click", () => {
  localStorage.clear();
  location.reload();
});

// ===============================
// CONTROL DE ROLES
// ===============================
function aplicarRoles() {
  // Profesor = administrador
  if (usuarioLogueado.rol !== "profesor") {
    document.querySelectorAll(".admin-only").forEach(el => el.remove());
  }
}

// ===============================
// USUARIOS
// ===============================
async function cargarUsuarios() {
  try {
    const res = await fetch(`${API_URL}/usuarios`);
    usuariosLista = await res.json();
    renderUsuarios(usuariosLista);
  } catch (err) {
    console.error("Error cargando usuarios", err);
  }
}

function renderUsuarios(lista) {
  tablaUsuarios.innerHTML = "";

  lista.forEach(u => {
    tablaUsuarios.innerHTML += `
      <tr>
        <td>${u.id}</td>
        <td>${u.cedula}</td>
        <td>${u.nombre}</td>
        <td>
          <span class="badge bg-${
            u.rol === "profesor" ? "info" : "success"
          }">
            ${u.rol}
          </span>
        </td>
        <td class="admin-only">
          <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${u.id})">
            🗑
          </button>
        </td>
      </tr>
    `;
  });
}

window.eliminarUsuario = async (id) => {
  if (!confirm("¿Eliminar usuario?")) return;

  await fetch(`${API_URL}/usuarios/${id}`, { method: "DELETE" });
  cargarUsuarios();
};

// ===============================
// BUSCADOR
// ===============================
if (inputBuscar) {
  inputBuscar.addEventListener("input", e => {
    const texto = e.target.value.toLowerCase();
    const filtrados = usuariosLista.filter(u =>
      u.nombre.toLowerCase().includes(texto) ||
      u.cedula.includes(texto)
    );
    renderUsuarios(filtrados);
  });
}

// ===============================
// MATERIAS
// ===============================
async function cargarMaterias() {
  try {
    const res = await fetch(`${API_URL}/materia`);
    materiasLista = await res.json();
    renderMaterias(materiasLista);
  } catch (err) {
    console.error("Error cargando materias", err);
  }
}

function renderMaterias(lista) {
  tablaMaterias.innerHTML = "";

  if (lista.length === 0) {
    tablaMaterias.innerHTML = `
      <tr>
        <td colspan="2" class="text-center">No hay materias</td>
      </tr>
    `;
    return;
  }

  lista.forEach(m => {
    tablaMaterias.innerHTML += `
      <tr>
        <td>${m.codigo}</td>
        <td>${m.nombre}</td>
      </tr>
    `;
  });
}

// ===============================
// CREAR MATERIA
// ===============================
window.crearMateria = async () => {
  const input = document.getElementById("nombreMateria");
  const nombre = input.value.trim();

  if (!nombre) return alert("Escribe el nombre de la materia");

  const res = await fetch(`${API_URL}/materia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg || "Error al crear materia");
    return;
  }

  input.value = "";
  cargarMaterias();
  };