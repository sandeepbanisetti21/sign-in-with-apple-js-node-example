require('dotenv').config()

const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken');
const fs = require('fs')
const axios = require('axios')
const querystring = require('querystring')

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')))

const getClientSecret = () => {
	// sign with RSA SHA256
	const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_FILE_PATH);
	const headers = {
		kid: process.env.KEY_ID,
		typ: undefined // is there another way to remove type?
	}
	const claims = {
		'iss': process.env.TEAM_ID,
		'aud': 'https://appleid.apple.com',
		'sub': process.env.CLIENT_ID,
	}

	token = jwt.sign(claims, privateKey, {
		algorithm: 'ES256',
		header: headers,
		expiresIn: '24h'
	});
	console.log(token)
	return token
}

const getUserId = (token) => {
	const parts = token.split('.')
	try {
		return JSON.parse(new Buffer(parts[1], 'base64').toString('ascii'))
	} catch (e) {
		return null
	}
}

app.post('/callback', bodyParser.urlencoded({ extended: false }), (req, res) => {
	console.log(req.body.id_token)
	const clientSecret = 'eyJraWQiOiJUNjlINzdBRks2IiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJWMzJXTVI5NUNUIiwiaWF0IjoxNTc1ODc1NDg3LCJleHAiOjE1OTE0Mjc0ODcsImF1ZCI6Imh0dHBzOi8vYXBwbGVpZC5hcHBsZS5jb20iLCJzdWIiOiJjb20uYW1hem9uYXdzLmVjMi01NC04MC0xNzItMjQzLmNvbXB1dGUtMS5jbGllbnQifQ.9WigqLy8pXYkxY3kMFJ368gI1e230SDMg9fEEcgYKdrGcgJlmPh0APtQJOMG73OaSm3LX5itsC-8cf-u_vlmYg'
	const requestBody = {
		grant_type: 'authorization_code',
		code: req.body.code,
		redirect_uri: 'http://ec2-54-80-172-243.compute-1.amazonaws.com:8080/callback',
		client_id: 'com.amazonaws.ec2-54-80-172-243.compute-1.client',
		client_secret: clientSecret,
		scope: 'name email'
	}
	axios.request({
		method: "POST",
		url: "https://appleid.apple.com/auth/token",
		data: querystring.stringify(requestBody),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
	}).then(response => {
		return res.json({
			success: true,
			data: response.data,
			user: getUserId(response.data.id_token)
		})
	}).catch(error => {
		return res.status(500).json({
			success: false,
			error: error.response.data
		})
	})
})

app.listen(8080, () => console.log(`App listening on port ${process.env.PORT || 8080}!`))