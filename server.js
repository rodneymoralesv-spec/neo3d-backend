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

db.query("SELECT 1", (err, result) => {
  if (err) {
    console.log("❌ ERROR CONEXIÓN:", err);
  } else {
    console.log("✅ CONEXIÓN OK");
  }
});


app.use(cors());
app.use(express.json());

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