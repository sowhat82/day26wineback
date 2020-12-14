// load the libs
const express = require('express')
const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017' /* connection string */

// for cloud storage using env variables
// const mongourl = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@cluster0.ow18z.mongodb.net/<dbname>?retryWrites=true&w=majority`

// create a client pool
const client = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true });    

// configure port
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

// create an instance of the application
const app = express()

//start server

client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.info(`Application started on port ${PORT} at ${new Date()}`)        
         })
    })
    .catch(e => {
            console.error('canot connect to mongodb: ', e)
    })
    

// get /country/:country
app.get('/country/:country', async (req, resp) => {

    const country = req.params['country']

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
        .limit(30)
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

//object id string title price