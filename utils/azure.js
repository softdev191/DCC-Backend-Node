import AzureStorageBlob from '@azure/storage-blob';
const { BlobServiceClient } = AzureStorageBlob;

export class FileData {
  containerClient = null;

  constructor(containerName, connectionStr = 'DefaultEndpointsProtocol=https;AccountName=dcchear;AccountKey=DPNTt8aaImG+CqsDnYvGGfM7kZgktNN19gkIk46VoyZ1O8piKtKGPtzTzqSWUy7RD7EMsr10clCFpeLaCsfdLw==;EndpointSuffix=core.windows.net') {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionStr);
    this.containerClient = blobServiceClient.getContainerClient(containerName);
  }

  storeFile = async (data, fileName) => {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.deleteIfExists();
    await blockBlobClient.uploadData(data);
  }
}
