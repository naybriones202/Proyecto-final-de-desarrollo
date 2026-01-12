import 'dotenv/config';
import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import bcrypt from "bcryptjs";

pool.query("SELECT 1")
  .then(() => console.log("✅ Conectado a Supabase"))
  .catch(err => console.error("❌ Error de conexión:", err));


const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
//      RUTAS DE USUARIOS
// ==========================================

// 1. Crear Usuario (CON ENCRIPTACIÓN Y VALIDACIÓN)
app.post("/usuarios", async (req, res) => {
  try {
    const { cedula, nombre, clave } = req.body;
    
    // Validar campos
    if (!cedula || !nombre || !clave) {
      return res.status(400).json({ msg: "Todos los campos son obligatorios" });
    }

    // --- ENCRIPTACIÓN ---
    const salt = await bcrypt.genSalt(10); 
    const claveEncriptada = await bcrypt.hash(clave, salt);
    
    // Guardamos en la base de datos
    const query = "INSERT INTO usuarios (cedula, nombre, clave) VALUES ($1, $2, $3) RETURNING *";
    const result = await pool.query(query, [cedula, nombre, claveEncriptada]);
    
    res.json({ msg: "Usuario registrado", data: result.rows[0] });

  } catch (error) {
    if (error.code === '23505') {
        return res.status(400).json({ msg: "Esa cédula ya está registrada" });
    }
    res.status(500).json({ error: error.message });
  }
});

// 2. Ver usuario por ID
app.get("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ msg: "Usuario no encontrado" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Ver todos los usuarios
app.get("/usuarios", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Editar Usuario
app.put("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cedula, nombre, clave } = req.body;
    
    // Si quisieras re-encriptar la clave al editar, hazlo aquí.
    // Por ahora mantenemos la lógica simple que tenías.
    const result = await pool.query(
      "UPDATE usuarios SET cedula = $1, nombre = $2, clave = $3 WHERE id = $4 RETURNING *",
      [cedula, nombre, clave, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ msg: "Usuario no encontrado" });
    res.json({ msg: "Usuario actualizado", data: result.rows[0] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Eliminar Usuario
app.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM usuarios WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ msg: "Usuario no encontrado" });
    res.json({ msg: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
//      RUTAS DE MATERIAS
// ==========================================

// 1. Crear Materia
app.post("/materias", async (req, res) => {
  try {
    const { codigo, nombre } = req.body;
    
    if (!codigo || !nombre) {
      return res.status(400).json({ msg: "El código y nombre son obligatorios" });
    }

    const result = await pool.query(
      "INSERT INTO materias (codigo, nombre) VALUES ($1, $2) RETURNING *",
      [codigo, nombre]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
        return res.status(400).json({ msg: "El código de materia ya existe" });
    }
    res.status(500).json({ error: error.message });
  }
});

// 2. Ver todas las materias
app.get("/materias", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM materias ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Ver UNA materia por ID 
app.get("/materias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM materias WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Materia no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Editar Materia
app.put("/materias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre } = req.body;
    
    const result = await pool.query(
      "UPDATE materias SET codigo = $1, nombre = $2 WHERE id = $3 RETURNING *",
      [codigo, nombre, id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ msg: "Materia no encontrada" });
    res.json({ msg: "Materia actualizada", data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Eliminar Materia
app.delete("/materias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM materias WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ msg: "Materia no encontrada" });
    res.json({ msg: "Materia eliminada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
//      RUTAS DE ESTUDIANTES (NUEVO)
// ==========================================

// 1. Ver todos los estudiantes
app.get("/estudiantes", async (req, res) => {
  try {
    // Ordenamos por nombre alfabéticamente
    const result = await pool.query("SELECT * FROM estudiantes ORDER BY nombre ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Crear Estudiante
app.post("/estudiantes", async (req, res) => {
  try {
    const { cedula, nombre } = req.body;
    
    // Validación de campos vacíos
    if (!cedula || !nombre) {
        return res.status(400).json({ msg: "Cédula y Nombre son obligatorios" });
    }

    const result = await pool.query(
      "INSERT INTO estudiantes (cedula, nombre) VALUES ($1, $2) RETURNING *",
      [cedula, nombre]
    );
    res.json(result.rows[0]);

  } catch (error) {
    // Error de duplicidad (Unique key violation)
    if (error.code === '23505') {
        return res.status(400).json({ msg: "Ya existe un estudiante con esa cédula" });
    }
    res.status(500).json({ error: error.message });
  }
});

// 3. Eliminar Estudiante
app.delete("/estudiantes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM estudiantes WHERE id = $1 RETURNING *", [id]);
    
    if (result.rows.length === 0) {
        return res.status(404).json({ msg: "Estudiante no encontrado" });
    }
    res.json({ msg: "Estudiante eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
//           RUTAS DE NOTAS
// ==========================================

// 1. VER NOTAS
app.get("/notas", async (req, res) => {
  try {
    const query = `
      SELECT 
        n.id,
        e.nombre AS estudiante,
        m.nombre AS materia,
        n.nota
      FROM notas n
      JOIN estudiantes e ON n.estudiante_id = e.id
      JOIN materias m ON n.materia_id = m.id
      ORDER BY n.id DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("ERROR GET /notas:", error);
    res.status(500).json({ error: error.message });
  }
});


// 2. INSERTAR O ACTUALIZAR NOTA (UPSERT MANUAL)
app.post("/notas", async (req, res) => {
  try {
    const { estudiante_id, materia_id, nota } = req.body;

    // Validación
    if (!estudiante_id || !materia_id || nota === undefined) {
      return res.status(400).json({ msg: "Faltan datos para la nota" });
    }

    // Verificar si ya existe
    const check = await pool.query(
      "SELECT id FROM notas WHERE estudiante_id = $1 AND materia_id = $2",
      [estudiante_id, materia_id]
    );

    if (check.rows.length > 0) {
      // UPDATE
      await pool.query(
        "UPDATE notas SET nota = $1 WHERE estudiante_id = $2 AND materia_id = $3",
        [nota, estudiante_id, materia_id]
      );
      res.json({ msg: "Nota actualizada correctamente" });
    } else {
      // INSERT
      await pool.query(
        "INSERT INTO notas (estudiante_id, materia_id, nota) VALUES ($1, $2, $3)",
        [estudiante_id, materia_id, nota]
      );
      res.json({ msg: "Nota registrada correctamente" });
    }

  } catch (error) {
    console.error("ERROR POST /notas:", error);
    res.status(500).json({ error: error.message });
  }
});


// 3. ELIMINAR NOTA
app.delete("/notas/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM notas WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Nota no encontrada" });
    }

    res.json({ msg: "Nota eliminada correctamente" });

  } catch (error) {
    console.error("ERROR DELETE /notas:", error);
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
//      RUTA DE LOGIN (AUTENTICACIÓN)
// ==========================================
app.post("/login", async (req, res) => {
  try {
    const { cedula, clave } = req.body;

    if (!cedula || !clave) {
      return res.status(400).json({ msg: "Faltan credenciales" });
    }

    // 1. Buscar usuario SOLO por cédula
    const query = "SELECT * FROM usuarios WHERE cedula = $1";
    const result = await pool.query(query, [cedula]);

    // 2. Si no existe la cédula
    if (result.rows.length === 0) {
      return res.status(401).json({ msg: "Usuario no encontrado" });
    }

    const usuario = result.rows[0];

    // 3. COMPARAR CLAVES (La que escribió vs La encriptada en BD)
    const esCorrecta = await bcrypt.compare(clave, usuario.clave);

    if (!esCorrecta) {
      return res.status(401).json({ msg: "Contraseña incorrecta" });
    }

    // 4. Todo OK
    res.json({ 
      msg: "Login exitoso", 
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        cedula: usuario.cedula
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// ==========================================
//   INICIALIZACIÓN DEL ADMIN (SOLUCIÓN)
// ==========================================
async function crearAdminPorDefecto() {
  try {
    const cedulaAdmin = "1314741289"; // Tu cédula
    const nombreAdmin = "Ezequiel Rodriguez"; // Tu nombre
    const claveAdmin = "admin04"; // Contraseña de acceso

    // Verificar si ya existe el usuario
    const check = await pool.query("SELECT * FROM usuarios WHERE cedula = $1", [cedulaAdmin]);
    
    if (check.rows.length === 0) {
      console.log("⚠️ Admin no encontrado. Creando usuario administrador seguro...");
      
      // Encriptar la clave por defecto
      const salt = await bcrypt.genSalt(10);
      const claveEncriptada = await bcrypt.hash(claveAdmin, salt);

      // Insertar en la BD
      await pool.query(
        "INSERT INTO usuarios (cedula, nombre, clave) VALUES ($1, $2, $3)",
        [cedulaAdmin, nombreAdmin, claveEncriptada]
      );
      
      console.log(`✅ Usuario Administrador creado: Cédula ${cedulaAdmin}`);
    } else {
      console.log("ℹ️ El sistema ya tiene administrador. Inicio normal.");
    }
  } catch (error) {
    console.error("Error creando admin por defecto:", error);
  }
}

// Ejecutamos la verificación antes de levantar el puerto
crearAdminPorDefecto();

// ==========================================
//      SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
