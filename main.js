// load the libs
const express = require('express')
const MongoClient = require('mongodb').MongoClient;
const morgan = require ('morgan')
const url = 'mongodb://localhost:27017' /* connection string */
const mysql = require('mysql2/promise')
const secureEnv = require('secure-env')
global.env = secureEnv({secret:'mySecretPassword'})
const bodyParser = require('body-parser');

// for cloud storage using env variables
// const mongourl = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@cluster0.ow18z.mongodb.net/<dbname>?retryWrites=true&w=majority`

// create a client pool
const client = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true });    

// configure port
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

// to allow searching based on ObjectID
var ObjectId = require('mongodb').ObjectID;

// create an instance of the application
const app = express()
app.use(morgan('combined'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

//start server
const startApp = async (app, pool) => {
	const conn = await pool.getConnection()
	try {
		console.info('Pinging database...')
		await conn.ping()

        client.connect()
        .then(() => {
            app.listen(PORT, () => {
                console.info(`Application started on port ${PORT} at ${new Date()}`)        
            })
        })
        .catch(e => {
                console.error('canot connect to mongodb: ', e)
        })
    } catch(e) {
		console.error('Cannot ping database', e)
	} finally {
		conn.release()
	}
}
// create connection pool
const pool = mysql.createPool({
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT) || 3306,
	database: 'wine',
	user: process.env.DB_USER || global.env.DB_USER,
	password: process.env.DB_PASSWORD || global.env.DB_PASSWORD,
	connectionLimit: 4
})
// start the app
startApp(app, pool)

// client.connect()
//     .then(() => {
//         app.listen(PORT, () => {
//             console.info(`Application started on port ${PORT} at ${new Date()}`)        
//          })
//     })
//     .catch(e => {
//             console.error('canot connect to mongodb: ', e)
//     })
    

// get all countries
app.get('/countries', async (req, resp) => {

    try{
        const result = await client.db('winemag')
        .collection('wine')
        .distinct('country')
        // .toArray()

        resp.status(200)
        resp.type('application/json')
        resp.json(result)

    }
    catch(e){
        console.info(e)
    }

})

// get /country/:country
app.get('/country', async (req, resp) => {

    // receive params from angular
    const country = req.query.country
    const OFFSET = parseInt(req.query.offset)
    const LIMIT = parseInt(req.query.limit)

    console.info(country)

    try{
        const result = await client.db('winemag')
        .collection('wine')
        .find(
            {
                country: {
                    $regex: country,
                    $options: 'i'
                }              
            },
        
        ).sort({country:1})
        .limit(LIMIT)
        .skip(OFFSET)
        .project({title:1, price:1, country:1})
        .toArray()

        resp.status(200)
        resp.type('application/json')
        resp.json(result)

    }
    catch(e){
        console.info(e)
    }

})

// get country items count
app.get('/countryItemsCount', async (req, resp) => {

    const country = req.query.country

    try{
        const result = await client.db('winemag')
        .collection('wine')
        .find(
            {
                country: {
                    $regex: country,
                    $options: 'i'   // case insensitive
                }              
            },
        
        ).count()

        console.info ('count', result)
        resp.status(200)
        resp.type('application/json')
        resp.json(result)

    }
    catch(e){
        console.info(e)
    }

})

// get wine details
app.get('/wineDetails/:wineID', async (req, resp) => {

    const wineID = req.params['wineID']

    try{
        const result = await client.db('winemag')
        .collection('wine')
        .find(
            {
                _id: ObjectId(wineID)          
            },
        
        )
        // .project({title:1, price:1, country:1})
        .toArray()

        resp.status(200)
        resp.type('application/json')
        resp.json(result)

    }
    catch(e){
        console.info(e)
    }

})

// add wine details to SQL
app.post('/addWineDetails', async (req, resp) => {

    const wineID = req.body.wineID;
    const wineName = req.body.wineName;

	const conn = await pool.getConnection()
	try {

		await conn.beginTransaction() // to prevent only one DB from being updated

        await conn.query(
            'insert into winecookies (wineID, winename) values (?,?)', [wineID, wineName],
		)

		await conn.commit()

		resp.status(200)
		// resp.format({
		// 	html: () => { resp.send('Thank you'); },
		// 	json: () => { resp.json({status: 'ok'});}

		// })
		resp.json()

	} catch(e) {
		conn.rollback()
		resp.status(500).send(e)
		resp.end()
	} finally {
		conn.release()
	}
});

app.use(
    express.static(__dirname + '/day26winefront')
)