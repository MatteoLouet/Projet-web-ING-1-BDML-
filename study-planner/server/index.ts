import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// dotenv.config() lit le fichier .env et charge les variables dans process.env.
// C'est grâce à ça qu'on peut faire process.env.GROQ_API_KEY plus bas.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // On prend le port défini dans .env, sinon 3001 par défaut

// Ces deux lignes "préparent" Express :
// - cors() autorise le frontend (port 5173) à parler au backend (port 3001)
// - express.json() permet de lire automatiquement le corps des requêtes en JSON
app.use(cors());
app.use(express.json());

// On définit une "route" POST sur /api/generate-plan.
// Quand le frontend fait fetch("/api/generate-plan", { method: "POST" }), c'est cette fonction qui répond.
app.post('/api/generate-plan', async (req: Request, res: Response) => {
    // On récupère la clé API depuis les variables d'environnement (fichier .env).
    // On ne la met PAS directement dans le code pour ne pas l'exposer sur GitHub.
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Clé API non configurée.' });
    }

    // req.body contient les données envoyées par le frontend (JSON.stringify(goal))
    const { title, level, hoursPerWeek } = req.body;

    // Le "prompt" est le message qu'on envoie à l'IA pour lui expliquer ce qu'on veut.
    // On lui demande de répondre en JSON pour pouvoir traiter la réponse facilement.
    const prompt = `Crée un plan d'étude pour : "${title}" (Niveau: ${level}, ${hoursPerWeek}h/semaine).
Réponds UNIQUEMENT en JSON valide.
Structure : {"overview":{"approach":"..."},"weeks":[{"weekNumber":1,"theme":"...","tasks":[{"title":"...","estimatedHours":2}]}]}
Génère 4 semaines d'étude variées.`;

    try {
        // fetch() côté serveur (Node.js) fonctionne pareil que côté navigateur.
        // On appelle l'API de Groq avec notre clé dans le header "Authorization".
        // C'est là que la vraie requête IA se passe — Groq va faire tourner le modèle Llama.
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`, // La clé prouve qu'on a le droit d'utiliser l'API
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile', // Le modèle d'IA qu'on utilise
                messages: [
                    // Le "system" explique à l'IA son rôle général
                    { role: 'system', content: 'Tu es un assistant pédagogique. Tu réponds UNIQUEMENT en JSON.' },
                    // Le "user" c'est le message qu'on lui envoie (notre prompt)
                    { role: 'user', content: prompt },
                ],
                // response_format force l'IA à répondre en JSON valide (sinon elle peut mettre du texte autour)
                response_format: { type: 'json_object' },
            }),
        });

        const data: any = await response.json();
        // La réponse de l'IA est dans data.choices[0].message.content (c'est le format de l'API Groq)
        const content = data.choices?.[0]?.message?.content || '{}';
        // JSON.parse() transforme la chaîne JSON reçue en objet utilisable dans notre code
        const plan = JSON.parse(content.replace(/```json|```/g, '').trim());

        res.json({ plan }); // On renvoie le plan au frontend
    } catch (error: any) {
        console.error('Erreur back:', error);
        res.status(500).json({ error: 'Une erreur est survenue, veuillez réessayer.' });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
