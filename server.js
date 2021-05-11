const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const moment = require('moment');
const multer = require('multer');

require("dotenv").config();

try {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  });
} catch (e) {
  console.warn(e);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const upload = multer();
app.use(upload.array());

const exerciseSchema = new mongoose.Schema({
  duration: String,
  date: Number,
  description: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  exercises: [exerciseSchema],
});

const User = mongoose.model("User", userSchema);

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", (req, res) => {
  User.find(null, "username _id")
    .exec()
    .then((result) => {
      res.json(result);
    })
    .catch((e) => {
      console.error(e);
      res.status(500).json({
        status: "error",
        error: e,
      });
    });
});

app.post("/api/users", (req, res) => {
  const username = req.body.username;

  User.create({ username })
    .then((result) => {
      const { username, _id } = result;
      res.json({
        username,
        _id,
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({
        status: "error",
        error: err,
      });
    });
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  console.log('body', req.body);
  let { description, duration, date } = req.body;

  if (!date) {
    date = Date.now();
  } else if (date) {
    date = moment(date).valueOf();
  }

  User.findOneAndUpdate(
    { _id: req.params._id },
    { $push: { exercises: { description, duration, date } } },
    { new: true },
    (error, success) => {
      if (error) {
        console.warn(error);
        res.status(500).json({
          status: "error",
          message: error,
        });
      }

      res.json(success);
    }
  );
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit: limitNo } = req.query;

  const fromTimestamp = moment(from, 'YYYY[-]MM[-]DD').valueOf();
  const toTimestamp = moment(to, 'YYYY[-]MM[-]DD').valueOf();

  try {
    const result = await User.find(
      {
        _id: req.params._id,
      },
      {
        _id: 1,
        exercises: {
          $elemMatch: { date: { $gte: fromTimestamp, $lte: toTimestamp } },
        },
      }
    )
      .limit(Number(limitNo))
      .exec();

    res.json({
      count: result[0].exercises.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
