import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";

const urlWithSasToken = "";
const blobServiceClient = new BlobServiceClient(urlWithSasToken);

export async function GetMealData(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const requestJson = await request.json() as MealData;

    if (requestJson.name === undefined) {
        return { status: 400, body: "getting container or blob name fail" };
    }
    const containerName = "meals";
    const blobName = requestJson.name;
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        const downloadBlockBlobResponse = await blobClient.download();

        const downloaded = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);

        return {
            status: 200,
            body: downloaded,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${blobName}"`
            }
        };
    } catch (error) {
        context.error(`Error downloading blob: ${error.message}`);
        return { status: 500, body: "Error downloading blob" };
    }
};

async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        readableStream.on("data", (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
    });
}

app.http('GetMealData', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetMealData
});


export type MealData = {
  name: string;
}
