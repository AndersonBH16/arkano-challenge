import mongoose, { Schema, Document, Model } from 'mongoose';
import { AiExplanation, AiExplanationProps, IAiExplanationRepository } from '../../domain/entities/AiExplanation';
import { v4 as uuidv4 } from 'uuid';

interface AiExplanationDocument extends Document<string> {
    transactionId: string;
    eventType: string;
    explanation: string;
    summary: string;
    userFriendlyMessage: string;
    rawEvent: Record<string, unknown>;
    createdAt: Date;
}

const AiExplanationSchema = new Schema<AiExplanationDocument>({
    _id: { type: String, default: uuidv4 },
    transactionId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    explanation: { type: String, required: true },
    summary: { type: String, required: true },
    userFriendlyMessage: { type: String, required: true },
    rawEvent: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const AiExplanationModel: Model<AiExplanationDocument> =
    mongoose.model('AiExplanation', AiExplanationSchema);

export class MongoAiExplanationRepository implements IAiExplanationRepository {
    async save(explanation: AiExplanation): Promise<AiExplanation> {
        const data = explanation.toJSON();
        const doc = new AiExplanationModel({
            _id: data.id,
            transactionId: data.transactionId,
            eventType: data.eventType,
            explanation: data.explanation,
            summary: data.summary,
            userFriendlyMessage: data.userFriendlyMessage,
            rawEvent: data.rawEvent,
            createdAt: data.createdAt,
        });
        await doc.save();
        return explanation;
    }

    async findByTransactionId(transactionId: string): Promise<AiExplanation | null> {
        const doc = await AiExplanationModel.findOne({ transactionId }).lean();
        return doc ? this.toDomain(doc) : null;
    }

    async findAll(limit = 20): Promise<AiExplanation[]> {
        const docs = await AiExplanationModel.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return docs.map(d => this.toDomain(d));
    }

    private toDomain(doc: Record<string, unknown>): AiExplanation {
        const props: AiExplanationProps = {
            id: String(doc['_id']),
            transactionId: doc['transactionId'] as string,
            eventType: doc['eventType'] as AiExplanationProps['eventType'],
            explanation: doc['explanation'] as string,
            summary: doc['summary'] as string,
            userFriendlyMessage: doc['userFriendlyMessage'] as string,
            rawEvent: doc['rawEvent'] as Record<string, unknown>,
            createdAt: doc['createdAt'] as Date,
        };
        return new AiExplanation(props);
    }
}