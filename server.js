const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

console.log("MYSQL_URL:", process.env.MYSQL_URL);


const db = mysql.createPool(process.env.MYSQL_URL);

db.query("SELECT 1", (err) => {
  if (err) console.log("❌ ERROR:", err);
  else console.log("✅ CONECTADO");
});

    db.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255),
        cliente VARCHAR(255),
        gramos FLOAT,
        horas FLOAT,
        manoDeObra FLOAT,
        cantidad INT,
        precioUnit FLOAT,
        precioTotal FLOAT,
        ajustado BOOLEAN,
        pagado BOOLEAN,
        fecha DATETIME
      )
    `, (err) => {
      if (err) console.log("Error creando tabla:", err);
      else console.log("Tabla lista");
    });

    db.query(`
  CREATE TABLE IF NOT EXISTS gastos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(255),
    categoria VARCHAR(100),
    monto FLOAT,
    fecha DATETIME
  )
`);

db.query(`
  CREATE TABLE IF NOT EXISTS catalogo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255),
    gramos FLOAT,
    horas FLOAT,
    manoDeObra FLOAT
  )
`);

db.query(`
  CREATE TABLE IF NOT EXISTS configuracion (
    id INT PRIMARY KEY,
    precioPorGramo FLOAT,
    precioPorHora FLOAT,
    porcentajeGanancia FLOAT,
    porcentajeRodney FLOAT
  )
`, (err) => {
  if (err) return console.log("Error creando tabla configuracion:", err);
  db.query(
    "INSERT INTO configuracion (id, precioPorGramo, precioPorHora, porcentajeGanancia, porcentajeRodney) VALUES (1, 0.02, 0.30, 0.30, 0.55) ON DUPLICATE KEY UPDATE id = id",
    (err2) => { if (err2) console.log("Error creando configuracion por defecto:", err2); }
  );
});

// Piezas nuevas que esperan pasar a la pagina web.
// Se usan cuando Rodney carga la pieza desde el celular: ahi el navegador no
// puede escribir en la carpeta PAGINA WEB, asi que la deja aqui y despues la
// PC la recoge con herramientas/recibir_de_app.py.
// La foto va en base64; MEDIUMTEXT aguanta hasta 16 MB.
db.query(`
  CREATE TABLE IF NOT EXISTS web_pendientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255),
    cat VARCHAR(50),
    esc VARCHAR(20),
    precio FLOAT,
    descripcion TEXT,
    tags TEXT,
    foto MEDIUMTEXT,
    gramos FLOAT,
    horas FLOAT,
    publicado BOOLEAN DEFAULT 0,
    fecha DATETIME
  )
`, (err) => {
  if (err) console.log("Error creando tabla web_pendientes:", err);
});

db.query("SELECT 1", (err, result) => {
  if (err) {
    console.log("❌ ERROR CONEXIÓN:", err);
  } else {
    console.log("✅ CONEXIÓN OK");
  }
});


app.use(cors());
// 12mb: las fotos de las piezas viajan en base64 dentro del JSON y el limite
// que trae express por defecto (100kb) las rechaza con "entity too large".
app.use(express.json({ limit: "12mb" }));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/", (req, res) => {
  res.send("Backend Neo3D funcionando 🚀");
});

app.get("/catalogo", (req, res) => {
  db.query("SELECT * FROM catalogo", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.post("/catalogo", (req, res) => {
  const { nombre, gramos, horas, manoDeObra } = req.body;

  db.query(
    "SELECT id FROM catalogo WHERE LOWER(nombre) = LOWER(?) LIMIT 1",
    [nombre],
    (err, rows) => {
      if (err) return res.status(500).send(err);

      if (rows.length > 0) {
        db.query(
          "UPDATE catalogo SET nombre = ?, gramos = ?, horas = ?, manoDeObra = ? WHERE id = ?",
          [nombre, gramos, horas, manoDeObra, rows[0].id],
          (err2) => {
            if (err2) return res.status(500).send(err2);
            res.send("OK");
          }
        );
      } else {
        db.query(
          "INSERT INTO catalogo (nombre, gramos, horas, manoDeObra) VALUES (?, ?, ?, ?)",
          [nombre, gramos, horas, manoDeObra],
          (err2) => {
            if (err2) return res.status(500).send(err2);
            res.send("OK");
          }
        );
      }
    }
  );
});

app.delete("/catalogo/:id", (req, res) => {
  const { id } = req.params;

  db.query("SELECT nombre FROM catalogo WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).send(err);
    if (rows.length === 0) return res.status(404).send("No encontrado");

    db.query(
      "DELETE FROM catalogo WHERE LOWER(nombre) = LOWER(?)",
      [rows[0].nombre],
      (err2) => {
        if (err2) return res.status(500).send(err2);
        res.send("OK");
      }
    );
  });
});

app.get("/config", (req, res) => {
  db.query("SELECT * FROM configuracion WHERE id = 1", (err, rows) => {
    if (err) return res.status(500).send(err);
    res.json(rows[0] || {});
  });
});

app.put("/config", (req, res) => {
  const { precioPorGramo, precioPorHora, porcentajeGanancia, porcentajeRodney } = req.body;

  db.query(
    "UPDATE configuracion SET precioPorGramo = ?, precioPorHora = ?, porcentajeGanancia = ?, porcentajeRodney = ? WHERE id = 1",
    [precioPorGramo, precioPorHora, porcentajeGanancia, porcentajeRodney],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Configuración actualizada" });
    }
  );
});

app.get("/gastos", (req, res) => {
  db.query("SELECT * FROM gastos", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.post("/gastos", (req, res) => {
  const { descripcion, categoria, monto, fecha } = req.body;

  const fechaMySQL = new Date(fecha)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  db.query(
    "INSERT INTO gastos (descripcion, categoria, monto, fecha) VALUES (?, ?, ?, ?)",
    [descripcion, categoria, monto, fechaMySQL],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send("OK");
    }
  );
});

app.post("/ventas", (req, res) => {

  const {
    nombre,
    cliente,
    gramos,
    horas,
    manoDeObra,
    cantidad,
    precioUnit,
    precioTotal,
    ajustado,
    pagado,
    fecha
  } = req.body;

  

  // 🔥 CONVERSIÓN CORRECTA DE FECHA
  const fechaMySQL = new Date(fecha)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const sql = `
    INSERT INTO ventas
    (
      nombre,
      cliente,
      gramos,
      horas,
      manoDeObra,
      cantidad,
      precioUnit,
      precioTotal,
      ajustado,
      pagado,
      fecha
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      nombre,
      cliente,
      gramos,
      horas,
      manoDeObra,
      cantidad,
      precioUnit,
      precioTotal,
      ajustado,
      pagado,
      fechaMySQL // ✅ ahora sí existe
    ],
    (err, result) => {

      if (err) {
        console.log("❌ ERROR INSERT:", err);
        res.status(500).send("Error guardando venta");
      } else {
        console.log("✅ Venta insertada:", result.insertId);
        res.status(201).json({ message: "Venta guardada" });
      }

    }
  );

});


app.get("/ventas", (req, res) => {

  const sql = "SELECT * FROM ventas ORDER BY id DESC";

  db.query(sql, (err, result) => {

    if (err) {
      console.log(err);
      res.status(500).json({ error: err.message });
    } else {
      res.json(result);
    }

  });

});

app.put("/ventas/:id", (req, res) => {
  const { id } = req.params;
  const { pagado } = req.body;

  const sql = "UPDATE ventas SET pagado = ? WHERE id = ?";

  db.query(sql, [pagado, id], (err, result) => {
    if (err) {
      console.log("❌ ERROR UPDATE:", err);
      res.status(500).send("Error actualizando venta");
    } else {
      console.log("💰 Venta actualizada:", id, pagado);
      res.json({ message: "Venta actualizada" });
    }
  });
});

app.delete("/ventas/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM ventas WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log("❌ ERROR DELETE:", err);
      res.status(500).send("Error eliminando venta");
    } else {
      console.log("🗑️ Venta eliminada:", id);
      res.json({ message: "Venta eliminada" });
    }
  });
});

// ── PIEZAS PENDIENTES DE PASAR A LA PAGINA WEB ──────────────────
// Guarda una pieza cargada desde el celular.
app.post("/web-pendientes", (req, res) => {
  const { nombre, cat, esc, precio, descripcion, tags, foto, gramos, horas } = req.body;

  if (!nombre) return res.status(400).send("Falta el nombre");

  db.query(
    `INSERT INTO web_pendientes
     (nombre, cat, esc, precio, descripcion, tags, foto, gramos, horas, publicado, fecha)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [nombre, cat || "personalizados", esc || null, precio || 0,
     descripcion || "", tags || "", foto || null, gramos || null, horas || null,
     new Date().toISOString().slice(0, 19).replace("T", " ")],
    (err, result) => {
      if (err) {
        console.log("❌ ERROR INSERT web_pendientes:", err);
        return res.status(500).send("Error guardando la pieza");
      }
      console.log("🌐 Pieza pendiente guardada:", result.insertId, nombre);
      res.status(201).json({ id: result.insertId });
    }
  );
});

// Lista lo que falta publicar. ?todas=1 devuelve tambien lo ya publicado.
app.get("/web-pendientes", (req, res) => {
  const sql = req.query.todas
    ? "SELECT * FROM web_pendientes ORDER BY id"
    : "SELECT * FROM web_pendientes WHERE publicado = 0 ORDER BY id";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).send(err);
    res.json(rows);
  });
});

// La PC marca la pieza como ya publicada y suelta la foto para no ocupar espacio.
app.put("/web-pendientes/:id/publicado", (req, res) => {
  db.query(
    "UPDATE web_pendientes SET publicado = 1, foto = NULL WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).send(err);
      console.log("✅ Pieza publicada en la web:", req.params.id);
      res.json({ message: "Marcada como publicada" });
    }
  );
});

app.delete("/web-pendientes/:id", (req, res) => {
  db.query("DELETE FROM web_pendientes WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).send(err);
    res.send("OK");
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});

app.delete("/gastos/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM gastos WHERE id = ?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.log("❌ ERROR DELETE GASTO:", err);
      res.status(500).send("Error eliminando gasto");
    } else {
      console.log("🗑️ Gasto eliminado:", id);
      res.send("OK");
    }
  });
});