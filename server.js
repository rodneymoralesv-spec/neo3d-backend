const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "neo3d"
});

db.connect((err) => {
  if (err) {
    console.log("Error conexión MySQL:", err);
  } else {
    console.log("MySQL conectado 🚀");
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


app.listen(3001, () => {
  console.log("Servidor corriendo en puerto 3001");
});