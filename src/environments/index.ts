import * as dotenv from 'dotenv'
dotenv.config()

// env
const NODE_ENV: string = process.env.NODE_ENV || 'development'

// app
const PORT: string = process.env.PORT || '11048'
const SECRET_KEY: string = process.env.SECRET_KEY || ''
const DOMAIN: string = process.env.DOMAIN || 'devcloud4.digihcs.com'
// const DOMAIN: string = process.env.DOMAIN || 'localhost'
const END_POINT: string = process.env.END_POINT || 'graphql'
const FE_URL: string = process.env.FE_URL || ''

// mail
const MAIL_USER: string = process.env.MAIL_USER || ''
const MAIL_PASS: string = process.env.MAIL_PASS || ''

// cloud
const CLOUD_NAME: string = process.env.CLOUD_NAME || ''
const API_KEY: string = process.env.API_KEY || 'API key test'
const API_SECRET: string = process.env.API_SECRET || ''

export {
	NODE_ENV,
	PORT,
	SECRET_KEY,
	DOMAIN,
	END_POINT,
	FE_URL,
	MAIL_USER,
	MAIL_PASS,
	CLOUD_NAME,
	API_KEY,
	API_SECRET
}
