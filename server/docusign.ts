import * as docusign from 'docusign-esign';
import * as fs from 'fs';
import * as path from 'path';

export interface DocuSignConfig {
  clientId: string;
  clientSecret: string;
  userId: string;
  accountId: string;
  baseUrl: string;
  privateKey: string;
}

export class DocuSignService {
  private client: docusign.ApiClient;
  private config: DocuSignConfig;

  constructor(config: DocuSignConfig) {
    this.config = config;
    this.client = new docusign.ApiClient();
    this.client.setBasePath(config.baseUrl);
  }

  async authenticate(): Promise<string> {
    try {
      // Use JWT authentication
      const scopes = ['signature', 'impersonation'];
      const rsaKey = this.config.privateKey;
      
      const results = await this.client.requestJWTUserToken(
        this.config.clientId,
        this.config.userId,
        scopes,
        rsaKey,
        3600 // 1 hour expiration
      );
      
      const accessToken = results.body.access_token;
      this.client.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
      
      return accessToken;
    } catch (error) {
      console.error('DocuSign authentication failed:', error);
      throw new Error('Failed to authenticate with DocuSign');
    }
  }

  async createEnvelope(documentPath: string, recipientEmail: string, recipientName: string, subject: string): Promise<any> {
    try {
      await this.authenticate();

      const envelopesApi = new docusign.EnvelopesApi(this.client);
      
      // Read the document
      const documentContent = fs.readFileSync(documentPath);
      const documentBase64 = documentContent.toString('base64');
      
      // Create the document
      const document = docusign.Document.constructFromObject({
        documentBase64: documentBase64,
        name: path.basename(documentPath),
        fileExtension: path.extname(documentPath).substring(1),
        documentId: '1'
      });

      // Create the signer
      const signer = docusign.Signer.constructFromObject({
        email: recipientEmail,
        name: recipientName,
        recipientId: '1',
        routingOrder: '1'
      });

      // Create the sign here tab
      const signHere = docusign.SignHere.constructFromObject({
        documentId: '1',
        pageNumber: '1',
        recipientId: '1',
        tabLabel: 'SignHereTab',
        xPosition: '195',
        yPosition: '147'
      });

      // Add the tab to the signer
      signer.tabs = docusign.Tabs.constructFromObject({
        signHereTabs: [signHere]
      });

      // Create the envelope definition
      const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
        emailSubject: subject,
        documents: [document],
        recipients: docusign.Recipients.constructFromObject({
          signers: [signer]
        }),
        status: 'sent'
      });

      // Create the envelope
      const results = await envelopesApi.createEnvelope(this.config.accountId, { envelopeDefinition });
      
      return {
        envelopeId: results.envelopeId,
        status: results.status,
        statusDateTime: results.statusDateTime
      };
    } catch (error) {
      console.error('Error creating DocuSign envelope:', error);
      throw new Error('Failed to create DocuSign envelope');
    }
  }

  async getEnvelopeStatus(envelopeId: string): Promise<any> {
    try {
      await this.authenticate();

      const envelopesApi = new docusign.EnvelopesApi(this.client);
      const envelope = await envelopesApi.getEnvelope(this.config.accountId, envelopeId);
      
      return {
        envelopeId: envelope.envelopeId,
        status: envelope.status,
        statusDateTime: envelope.statusDateTime,
        emailSubject: envelope.emailSubject
      };
    } catch (error) {
      console.error('Error getting envelope status:', error);
      throw new Error('Failed to get envelope status');
    }
  }

  async getSigningUrl(envelopeId: string, recipientEmail: string, returnUrl: string): Promise<string> {
    try {
      await this.authenticate();

      const envelopesApi = new docusign.EnvelopesApi(this.client);
      
      const recipientViewRequest = docusign.RecipientViewRequest.constructFromObject({
        authenticationMethod: 'none',
        email: recipientEmail,
        returnUrl: returnUrl,
        userName: recipientEmail,
        clientUserId: '1'
      });

      const results = await envelopesApi.createRecipientView(
        this.config.accountId,
        envelopeId,
        { recipientViewRequest }
      );

      return results.url;
    } catch (error) {
      console.error('Error getting signing URL:', error);
      throw new Error('Failed to get signing URL');
    }
  }

  async downloadCompletedDocument(envelopeId: string): Promise<Buffer> {
    try {
      await this.authenticate();

      const envelopesApi = new docusign.EnvelopesApi(this.client);
      const document = await envelopesApi.getDocument(this.config.accountId, envelopeId, 'combined');
      
      return Buffer.from(document, 'binary');
    } catch (error) {
      console.error('Error downloading document:', error);
      throw new Error('Failed to download completed document');
    }
  }

  async getEnvelopeRecipients(envelopeId: string): Promise<any> {
    try {
      await this.authenticate();

      const envelopesApi = new docusign.EnvelopesApi(this.client);
      const recipients = await envelopesApi.listRecipients(this.config.accountId, envelopeId);
      
      return recipients;
    } catch (error) {
      console.error('Error getting envelope recipients:', error);
      throw new Error('Failed to get envelope recipients');
    }
  }

  async voidEnvelope(envelopeId: string, reason: string): Promise<any> {
    try {
      await this.authenticate();

      const envelopesApi = new docusign.EnvelopesApi(this.client);
      
      const envelope = docusign.Envelope.constructFromObject({
        status: 'voided',
        voidedReason: reason
      });

      const results = await envelopesApi.update(this.config.accountId, envelopeId, { envelope });
      
      return results;
    } catch (error) {
      console.error('Error voiding envelope:', error);
      throw new Error('Failed to void envelope');
    }
  }
}

// Helper function to get DocuSign configuration from environment or settings
export function getDocuSignConfig(): DocuSignConfig | null {
  const clientId = process.env.DOCUSIGN_CLIENT_ID;
  const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET;
  const userId = process.env.DOCUSIGN_USER_ID;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const baseUrl = process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net/restapi';
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;

  if (!clientId || !clientSecret || !userId || !accountId || !privateKey) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    userId,
    accountId,
    baseUrl,
    privateKey
  };
}