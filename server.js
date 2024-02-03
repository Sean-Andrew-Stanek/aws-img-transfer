/************************** 
* 
*  AWS-IMG-TRANSFER
*  Server-Side App designed to list, upload 
*  and download files from an AWS S3.
* 
**************************/

const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3'),
    express = require('express'),
    fs = require('fs'),
    fileUpload = require('express-fileupload');

const cors = require('cors');




/////////////
//
// Global Variables and Configs
// Change the s3Client's region as needed
//
/////////////

const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: 'https://s3.amazonaws.com',
    forcePathStyle: true
});

//S3

const bucketID = process.env.BUCKET_NAME || '';

if(bucketID === '')
    console.log('Please input an S3 Bucket ID either through the environmental variable or in the code if testing');

if(!process.env.BUCKET_NAME)
    console.warn('No bucket given in environmental variable.');


const UPLOAD_TEMP_PATH = 'temp';

/////////////
//
//  Initiate Express
//
/////////////

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(fileUpload());
app.use(cors());

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

/////////////
//
//  List all objects in a bucket.
//
/////////////

app.get('/images', async (req, res) => {

    try {

        const listObjectsParams = {
            Bucket: bucketID
        }
        const listObjectsResponse = await s3Client.send(new ListObjectsV2Command(listObjectsParams));

        if(listObjectsResponse.Contents.length === 0) {
            res.send('No objects in the bucket');
        } else {
            res.status(200).json(listObjectsResponse)
        }
    
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }

});

/////////////
//
//  Upload an object to a bucket.
//
/////////////

app.post('/images', async (req, res) => {

    try {

        const file = req.files.image;
        const fileName = req.files.image.name;
        const tempPath = `${UPLOAD_TEMP_PATH}/${fileName}`;

        await file.mv(tempPath)
        
        //Upload File
        const uploadParams = {
            Bucket: bucketID,
            Key: fileName,
            Body: fs.createReadStream(tempPath),
        }

        await s3Client.send(new PutObjectCommand(uploadParams))

        res.send('File uploaded to S3 successfully.');

    } catch (error) {

        console.log(error);
        res.status(500).send('Internal Server Error');

    }

});

/////////////
//
//  Retrieve an object from a bucket.
//  The res.Body has the image
//
/////////////

app.get('/images/:imageName', async (req, res) => {

    try {

        const fileName = req.params.imageName;

        const getObjectParams = {
            Bucket: bucketID,
            Key: fileName
        };

        const getObjectResponse = 
            await s3Client.send(new GetObjectCommand(getObjectParams));
        
        res.setHeader('Content-Type', getObjectResponse.ContentType);
        res.setHeader('Content-Length', getObjectResponse.ContentLength);
        getObjectResponse.Body.pipe(res);

    } catch (error) {

        console.error(error);
        res.status(500).send('Internal Server Error');

    }
})


/////////////
//
//  Delete an object from a bucket.
//
/////////////

app.delete('/images/:imageName', async (req, res) => {

    try {

        const fileName = req.params.imageName;

        const deleteObjectParams = {
            Bucket: bucketID,
            Key: fileName
        };

        const deleteResponse = await s3Client.send(new DeleteObjectCommand(deleteObjectParams));
        
        if(deleteResponse.$metadata.httpStatusCode === 204) {
            res.status(200).send('Object Deleted!');
        } else {
            res.status(200).send('Object Deleted');
        }
        

    } catch (error) {

        if(error.name ==='NotFound'){
            res.status(404).send('File Not Found');
        } else {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
        

    }
})