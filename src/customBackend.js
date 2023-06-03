const express = require('express');
const cors = require('cors');

const PORT = 3001;

const app = express();

app.use(cors());
app.use(express.json());

console.log('here');

app.use(express.urlencoded({ extended: true }));


//custom express server running on port 4000 to send data to front end dashboard
app.use('/', (req, res) => {
  console.log('resource', JSON.stringify(req.body.resourceSpans[0].resource));
  console.log('scope spans', JSON.stringify( req.body.resourceSpans[0].scopeSpans));
  res.sendStatus(200);
});


app.use((err, req, res, next) => {
  const defaultError = {
    log: 'error at unknown middleware',
    code: 500,
    message: 'check error'
  };

  const newErr = Object.assign({}, defaultError, err);
  console.log(err);
  return res.status(newErr.code).json(newErr.message);
});

app.listen(PORT, () => {
  console.log('NextInspect express npm package running on port: ' + PORT);
});
