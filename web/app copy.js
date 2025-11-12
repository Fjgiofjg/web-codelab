/*
 * Copyright 2022 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const express = require('express');
const bodyParser = require('body-parser');
const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');

// TODO: Define Issuer ID
const issuerId = '3388000000023037640';

// TODO: Define Class ID
const classId = `${issuerId}.Monthly_Pass`;

const baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';

const credentials = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

const httpClient = new GoogleAuth({
  credentials: credentials,
  scopes: 'https://www.googleapis.com/auth/wallet_object.issuer'
});

/**
 * Creates a sample pass class based on the template defined below.
 * 
 * This class contains multiple editable fields that showcase how to 
 * customize your class.
 * 
 * @param res A representation of the HTTP result in Express.
 */
async function createPassClass(res) {
  // TODO: Create a Generic pass class


let response;
try {
  // Check if the class exists already
  response = await httpClient.request({
    url: `${baseUrl}/transitClass/${classId}`,
    method: 'GET'
  });

  console.log('Class already exists');
  console.log(response);
} catch (err) {
  if (err.response && err.response.status === 404) {
    // Class does not exist
    // Create it now
    response = await httpClient.request({
      url: `${baseUrl}/transitClass`,
      method: 'POST',
      data: transitClass
    });

    console.log('Class insert response');
    console.log(response);
  } else {
    // Something else went wrong
    console.log(err);
    // Do not send a response from this helper; let the caller handle it.
    // Sending a response here can cause "headers already sent" errors
    // if the caller also sends a response. Log and return so the caller
    // can decide how to proceed.
    return;
  }
}
}

/**
 * Creates a sample pass object based on a given class.
 * 
 * @param req A representation of the HTTP request in Express.
 * @param res A representation of the HTTP result in Express.
 * @param classId The identifier of the parent class used to create the object.
 */
async function createPassObject(req, res, classId) {
  // TODO: Create a new Generic pass for the user
let objectSuffix = `${req.body.email.replace(/[^\w.-]/g, '_')}`;
let objectId = `${issuerId}.${objectSuffix}`;

let transitObject = {
  'id': `${objectId}`,
  'classId': classId,
  "state": "ACTIVE",
  "tripType": "ROUND_TRIP",
  "passengerNames": "Pencil",
  "ticketLeg": {
    "originStationCode": "AIR",
    "originName": {
      "defaultValue": {
        "language": "en-us",
        "value": "Delta Airport"
      }
    },
    "destinationStationCode": "MIL",
    "destinationName": {
      "defaultValue": {
        "language": "en-us",
        "value": "Milienium"
      }
    },
    "carriage": "Lower Deck",
    "ticketSeat": {
      "coach": "U",
      "seat": "12D"
    },
  },
  'cardTitle': {
    'defaultValue': {
      'language': 'en',
      'value': 'Pentalic Transport Monthly Pass'
    }
  },
  'header': {
    'defaultValue': {
      'language': 'en',
      'value': 'Pencil'
    }
  },  
  "barcode": {
    "type": "DATA_MATRIX",
    'value': `${objectId}`,
    "alternateText": "12DU"
  }
};

// TODO: Create the signed JWT and link
const claims = {
  iss: credentials.client_email,
  aud: 'google',
  origins: [],
  typ: 'savetowallet',
  payload: {
    transitObjects: [
      transitObject
    ]
  }
};

const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
// Send a single response containing the save link and a short message.
res.send(`<a href='${saveUrl}'><img src='wallet-button.png'></a><p>Form submitted!</p>`);
}

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));
app.post('/', async (req, res) => {
  try {
    await createPassClass(res);
    await createPassObject(req, res, classId);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});
app.listen(3000);