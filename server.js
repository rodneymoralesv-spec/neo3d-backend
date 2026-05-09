const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();


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

db.query("SELECT 1", (err, result) => {
  if (err) {
    console.log("❌ ERROR CONEXIÓN:", err);
  } else {
    console.log("✅ CONEXIÓN OK");
  }
});


app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Neo3D funcionando 🚀");
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
      fecha
    ],
    (err, result) => {

      if (err) {
        console.log(err);
        res.status(500).send("Error guardando venta");
      } else {
        res.send("Venta guardada 🚀");
      }

    }
  );

});

app.get("/ventas", (req, res) => {

  const sql = "SELECT * FROM ventas ORDER BY id DESC";

  db.query(sql, (err, result) => {

    if (err) {
      console.log(err);
      res.status(500).send("Error obteniendo ventas");
    } else {
      res.json(result);
    }

  });

});


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto", PORT);
});