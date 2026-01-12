import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import bcrypt from "bcryptjs";


const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. LOGIN
// ==========================================
app.post("/login", async (req, res) => {
  try {
    const { cedula, clave } = req.body;

    // Buscar usuario
    const result = await pool.query("SELECT * FROM usuarios WHERE cedula = $1", [cedula]);

    if (result.rows.length === 0) {
      return res.status(401).json({ msg: "Usuario no encontrado" });
    }

    const usuario = result.rows[0];

    // Verificar contraseña
    const valido = await bcrypt.compare(clave, usuario.clave);
    if (!valido) {
      return res.status(401).json({ msg: "Contraseña incorrecta" });
    }

    delete usuario.clave; 
    res.json({ msg: "Ingreso exitoso", usuario });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. REGISTRAR USUARIO (Solo Estudiante o Profesor)
// ==========================================
app.post("/usuarios", async (req, res) => {
  try {
    const { cedula, nombre, clave, rol } = req.body;

    // A. Validaciones
    if (!cedula || !nombre || !clave || !rol) {
      return res.status(400).json({ msg: "Faltan datos obligatorios" });
    }

    // --- RESTRICCIÓN ESTRICTA DE ROLES ---
    if (rol !== 'estudiante' && rol !== 'profesor') {
        return res.status(400).json({ msg: "Rol inválido. Solo se permite: 'estudiante' o 'profesor'" });
    }

    // B. Encriptar clave
    const salt = await bcrypt.genSalt(10);
    const claveHash = await bcrypt.hash(clave, salt);

    // C. Insertar Usuario (Tabla Padre)
    const resultUsuario = await pool.query(
      "INSERT INTO usuarios (cedula, nombre, clave, rol) VALUES ($1, $2, $3, $4) RETURNING id, cedula, nombre, rol",
      [cedula, nombre, claveHash, rol]
    );

    const nuevoUsuario = resultUsuario.rows[0];

    // D. Insertar en Tabla Hija (Obligatorio)
    if (rol === 'estudiante') {
        await pool.query("INSERT INTO estudiantes (usuario_id) VALUES ($1)", [nuevoUsuario.id]);
    } else {
        // Como ya validamos arriba, si no es estudiante, es profesor 100% seguro
        await pool.query("INSERT INTO profesores (usuario_id) VALUES ($1)", [nuevoUsuario.id]);
    }

    res.json({ msg: "Usuario registrado correctamente", data: nuevoUsuario });

  } catch (error) {
    console.error(error);
    if (error.code === '23505') { 
        return res.status(409).json({ msg: "La cédula ya está registrada" });
    }
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. EDITAR USUARIO
// ==========================================
app.put("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cedula, nombre, clave, rol } = req.body;

    // Verificar si existe
    const userCheck = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    if (userCheck.rows.length === 0) return res.status(404).json({ msg: "Usuario no encontrado" });

    // Validar rol si se intenta cambiar
    if (rol && (rol !== 'estudiante' && rol !== 'profesor')) {
        return res.status(400).json({ msg: "Rol inválido" });
    }

    let query = "";
    let values = [];

    if (clave) {
        const salt = await bcrypt.genSalt(10);
        const claveHash = await bcrypt.hash(clave, salt);
        query = "UPDATE usuarios SET cedula=$1, nombre=$2, rol=$3, clave=$4 WHERE id=$5 RETURNING id, cedula, nombre, rol";
        values = [cedula, nombre, rol, claveHash, id];
    } else {
        query = "UPDATE usuarios SET cedula=$1, nombre=$2, rol=$3 WHERE id=$4 RETURNING id, cedula, nombre, rol";
        values = [cedula, nombre, rol, id];
    }

    const result = await pool.query(query, values);
    
    // Nota: Si cambias el rol de un usuario existente, recuerda que deberías moverlo
    // de la tabla 'estudiantes' a 'profesores' manualmente en la DB o agregar lógica aquí.
    
    res.json({ msg: "Usuario actualizado", usuario: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. OBTENER USUARIOS
// ==========================================
app.get("/usuarios", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, cedula, nombre, rol FROM usuarios ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT id, cedula, nombre, rol FROM usuarios WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ msg: "Usuario no encontrado" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. ELIMINAR USUARIO
// ==========================================
app.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    
    if (result.rowCount === 0) return res.status(404).json({ msg: "No encontrado" });
    res.json({ msg: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// RUTAS DE MATERIA (Sin cambios)
// ==========================================
app.post("/materia", async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ msg: "Nombre obligatorio" });

    const existe = await pool.query("SELECT 1 FROM materia WHERE LOWER(nombre) = LOWER($1)", [nombre]);
    if (existe.rows.length > 0) return res.status(409).json({ msg: "La materia ya existe" });

    const result = await pool.query("INSERT INTO materia (nombre) VALUES ($1) RETURNING codigo, nombre", [nombre]);
    res.json({ msg: "Materia registrada", data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/materia", async (req, res) => {
  try {
    const { buscar } = req.query;
    const query = buscar 
        ? "SELECT codigo, nombre FROM materia WHERE nombre ILIKE $1 ORDER BY codigo"
        : "SELECT codigo, nombre FROM materia ORDER BY codigo";
    
    const params = buscar ? [`%${buscar}%`] : [];
    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener materias" });
  }
});


app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));