import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares : autorisent les requêtes entre le front et le back, et la lecture du JSON
app.use(cors());
app.use(express.json());

/**
 * ROUTE : Générer un plan d'étude avec l'IA
 * Cette route reçoit les objectifs de l'utilisateur et interroge l'API Groq (Llama 3).
 */
app.post('/api/generate-plan', async (req: Request, res: Response) => {
    const apiKey = process.env.GROQ_API_KEY;

    // Vérification de la clé API
    if (!apiKey || apiKey === 'ta-clé-ici') {
        return res.status(500).json({ error: 'Configue ta GROQ_API_KEY dans le fichier .env !' });
    }

    const { title, level, hoursPerWeek } = req.body;

    // Le "prompt" est l'instruction qu'on envoie à l'IA
    const prompt = `Crée un plan d'étude pour : "${title}" (Niveau: ${level}, ${hoursPerWeek}h/semaine).
Réponds UNIQUEMENT en JSON valide.
Structure : {"overview":{"approach":"..."},"weeks":[{"weekNumber":1,"theme":"...","tasks":[{"title":"...","estimatedHours":2}]}]}
Génère 4 semaines d'étude variées.`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Tu es un assistant pédagogique. Tu réponds UNIQUEMENT en JSON.' },
                    { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
            }),
        });

        const data: any = await response.json();
        // L'IA peut parfois ajouter des balises markdown, on nettoie le texte
        const content = data.choices?.[0]?.message?.content || '{}';
        const plan = JSON.parse(content.replace(/```json|```/g, '').trim());

        res.json({ plan });
    } catch (error: any) {
        console.error('Erreur back:', error);
        res.status(500).json({ error: 'L\'IA a eu un petit problème, réessaie !' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur prêt sur http://localhost:${PORT}`);
});
