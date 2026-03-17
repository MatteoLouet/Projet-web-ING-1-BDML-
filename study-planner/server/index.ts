import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Interfaces for Backend ---

interface GeneratePlanRequest {
    title: string;
    level: string;
    hoursPerWeek: number;
    learningType: string;
    deadline?: string | null;
    duration?: string | null;
    constraints?: string | null;
}

interface StudyTask {
    id: string;
    title: string;
    description: string;
    estimatedHours: number;
    difficulty: string;
    type: string;
}

interface StudyWeek {
    weekNumber: number;
    theme: string;
    objectives: string[];
    tasks: StudyTask[];
}

interface Milestone {
    week: number;
    title: string;
    description: string;
}

interface StudyPlan {
    overview: {
        totalWeeks: number;
        totalHours: number;
        approach: string;
    };
    weeks: StudyWeek[];
    milestones: Milestone[];
    tips: string[];
}

// Endpoint pour générer un plan d'apprentissage via l'API Groq (gratuite)
app.post('/api/generate-plan', async (req: Request<{}, {}, GeneratePlanRequest>, res: Response) => {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || apiKey === 'ta-clé-ici') {
        return res.status(500).json({
            error: 'Clé API Groq non configurée. Ajoute ta clé dans le fichier .env (GROQ_API_KEY). Obtiens-la gratuitement sur https://console.groq.com',
        });
    }

    const { title, level, hoursPerWeek, learningType, deadline, duration, constraints } = req.body;

    if (!title) {
        return res.status(400).json({ error: "Le titre de l'objectif est requis." });
    }

    const prompt = `Crée un plan d'apprentissage structuré pour: "${title}".
Niveau: ${level}, ${hoursPerWeek}h/semaine, Type: ${learningType}.
${deadline ? `Échéance: ${deadline}` : duration ? `Durée: ${duration}` : ""}
${constraints ? `Contraintes/contexte: ${constraints}` : ""}

Tu DOIS répondre UNIQUEMENT avec du JSON valide, sans markdown, sans backticks, sans texte explicatif.
Le JSON doit suivre EXACTEMENT cette structure:
{"overview":{"totalWeeks":12,"totalHours":60,"approach":"description de la stratégie globale"},"weeks":[{"weekNumber":1,"theme":"thème de la semaine","objectives":["objectif 1","objectif 2"],"tasks":[{"id":"t1","title":"titre tâche","description":"description détaillée","estimatedHours":2,"difficulty":"easy","type":"theoretical"}]},{"weekNumber":2,"theme":"autre thème","objectives":["objectif 3"],"tasks":[{"id":"t2","title":"autre tâche","description":"description","estimatedHours":3,"difficulty":"medium","type":"practical"}]}],"milestones":[{"week":4,"title":"jalon important","description":"description du jalon"}],"tips":["conseil pratique 1","conseil pratique 2","conseil pratique 3"]}

Génère un plan complet et réaliste avec au moins 4 semaines détaillées, des tâches variées par semaine, et des conseils pertinents. Adapte le nombre total de semaines et d'heures au contexte donné.`;

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
                    {
                        role: 'system',
                        content: 'Tu es un assistant pédagogique expert. Tu réponds UNIQUEMENT en JSON valide, sans aucun texte autour, sans backticks, sans markdown.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 4096,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errorData: any = await response.json().catch(() => ({}));
            console.error('Erreur API Groq:', response.status, errorData);
            const msg = errorData?.error?.message || 'Erreur inconnue';
            return res.status(response.status).json({
                error: `Erreur API Groq (${response.status}): ${msg}`,
            });
        }

        const data: any = await response.json();
        const textContent = data.choices?.[0]?.message?.content || '';

        // Nettoyage et parsing du JSON
        const cleanedText = textContent.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const plan: StudyPlan = JSON.parse(cleanedText);

        res.json({ plan });
    } catch (error: any) {
        console.error('Erreur serveur:', error);
        res.status(500).json({
            error: `Erreur de génération: ${error.message}`,
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Serveur backend démarré sur http://localhost:${PORT}`);
    console.log(`   Utilise l'API Groq (gratuite, modèle Llama 3.3 70B)`);
});
