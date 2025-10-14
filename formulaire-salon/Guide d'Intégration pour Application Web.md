# Guide d'Intégration pour Application Web (CRUD, Requêtes GET multiples, GPT, Transcription)
Ce guide explique comment intégrer votre application à l'API qui gère à la fois les opérations CRUD (Create, Read, Update, Delete) dans MongoDB, les requêtes à GPT (ASK_GPT), la transcription audio et l'exécution de requêtes BigQuery.
---
## 1. Endpoint Principal (CRUD + GPT + BIGQUERY)
```
POST https://n8n.tools.intelligenceindustrielle.com/webhook/d2c3b9ea-debf-49e5-a911-f286a4394596
```
Toutes les requêtes CRUD, GPT et BigQuery passent par cet endpoint. Envoyez un objet JSON contenant un champ obligatoire `action`. Selon la valeur de `action`, l'Agent IA exécutera l'opération adéquate (MongoDB, GPT ou BigQuery).
### 1.1 Format de la Réponse
La réponse suit généralement ce format :
```json
{
  "success": true,
  "results": [ ... ]
}
```
- **success** : booléen, indique si la requête a réussi ou échoué.
- **results** : tableau d'objets décrivant le résultat. Par exemple :
- `{"inserted_id": "..."}` lors d'un **CREATE**
- `{"_id": "...", "software_id": "...", "data_type": "...", "json_data": {...}}` pour une lecture MongoDB
- `{"assistant_response": "..."}` pour une requête GPT
- `{"error": "..."}` si une erreur survient
En cas d'erreur, `success` sera `false` et `results` contiendra un objet `{ "error": "..." }`.
---
### 1.2 CREATE (action = "POST")
- **But** : insérer un nouveau document dans MongoDB.
- **Requête** :
```json
{
  "action": "POST",
  "software_id": "...",
  "data_type": "...",
  "description": "...",
  "json_data": { ... }
}
```
- `software_id` identifie votre logiciel.
- `data_type` indique le type de données.
- `json_data` est le contenu à sauvegarder.
**Réponse** (ex. réussite) :
```json
{
  "success": true,
  "results": [
    {
      "inserted_id": "abc123"
    }
  ]
}
```
---
### 1.3 READ All (action = "GET_ALL")
- **But** : récupérer **tous** les documents correspondant à un couple (`software_id`, `data_type`) dans MongoDB.
- **Requête** :
```json
{
  "action": "GET_ALL",
  "software_id": "...",
  "data_type": "..."
}
```
**Réponse** (ex. réussite) :
```json
{
  "success": true,
  "results": [
    {
      "_id": "abc123",
      "software_id": "...",
      "description": "...",
      "data_type": "...",
      "json_data": { ... }
    },
    ...
  ]
}
```
---
### 1.4 READ Last (action = "GET_LAST")
- **But** : récupérer **le dernier** document pour (`software_id`, `data_type`) dans MongoDB.
- **Requête** :
```json
{
  "action": "GET_LAST",
  "software_id": "...",
  "data_type": "..."
}
```
**Réponse** (ex. réussite) :
```json
{
  "success": true,
  "results": [
    {
      "_id": "abc123",
      "software_id": "...",
      "description": "...",
      "data_type": "...",
      "json_data": { ... }
    }
  ]
}
```
---
### 1.5 READ Natural (action = "GET_NATURAL")
- **But** : faire une requête en langage naturel (type ChatGPT) pour filtrer des données MongoDB.
- **Requête** :
```json
{
  "action": "GET_NATURAL",
  "software_id": "...",
  "data_type": "...",
  "query_intent": "...",
  "example_json_data": { ... } // facultatif
}
```
- `query_intent` : ex. "Tous les utilisateurs dont l'âge > 25"
- `example_json_data` : permet d'illustrer la structure du JSON.
**Réponse** : renvoie une liste similaire à "GET_ALL", mais filtrée.
---
### 1.6 READ via Mongo Filter (action = "GET_MONGO")
- **But** : fournir un filtre Mongo directement.
- **Requête** :
```json
{
  "action": "GET_MONGO",
  "software_id": "...",
  "data_type": "...",
  "mongo_filter": {
    "json_data.user.age": { "$gt": 25 }
  }
}
```
**Réponse** :
```json
{
  "success": true,
  "results": [
    {
      "_id": "abc123",
      "software_id": "...",
      "data_type": "...",
      "json_data": { ... }
    },
    ...
  ]
}
```
---
### 1.7 UPDATE (action = "UPDATE")
- **But** : modifier un ou plusieurs documents dans MongoDB.
- **Important** : vous devez envoyer **l'intégralité** du `json_data` mis à jour.
- **Requête** :
```json
{
  "action": "UPDATE",
  "software_id": "...",
  "data_type": "...",
  "record_id": "abc123", // OU
  "mongo_filter": { ... },
  "json_data": { ... } // contenu complet à remplacer
}
```
**Réponse** (ex. réussite) :
```json
{
  "success": true,
  "results": [
    {
      "updated_count": 1
    }
  ]
}
```
---
### 1.8 DELETE (action = "DELETE")
- **But** : supprimer un ou plusieurs documents dans MongoDB.
- **Requête** :
```json
{
  "action": "DELETE",
  "software_id": "...",
  "data_type": "...",
  "record_id": "abc123", // OU
  "mongo_filter": { ... }
}
```
**Réponse** (ex. réussite) :
```json
{
  "success": true,
  "results": [
    {
      "deleted_count": 2
    }
  ]
}
```
---
### 1.9 ASK_GPT (action = "ASK_GPT")
- **But** : questionner un modèle GPT, qui **répond toujours** en JSON.
- **Requête** :
```json
{
  "action": "ASK_GPT",
  "system_instruction": "Tu es un assistant expert en JavaScript.",
  "prompt": "Quelle est la différence entre let et var ?"
}
```
- **Important** : précisez le **format JSON** attendu dans le "results" de la réponse lorsque vous donnez vos instructions (prompt ou system_instruction). Tu n'as pas à lui parler de la clé "results". Tu dois simplement lui préciser le format de JSON et toi tu sauras que ce dernier sera présent dans la clé "results". Par exemple, vous pouvez inclure :
"Réponds toujours dans le format JSON suivant : { 'explication': '...' }"
**Exemple d'envoi** :
```json
{
  "action": "ASK_GPT",
  "system_instruction": "Tu es un assistant JavaScript. Réponds toujours avec un JSON du type { 'explication': '...' }.",
  "prompt": "Quelle est la différence entre let et var ?"
}
```
**Exemple de réponse** :
```json
{
  "success": true,
  "results": [
    {
      "assistant_response": "{\"explication\": \"'let' a une portée de bloc, tandis que 'var' a une portée de fonction...'\"}"
    }
  ]
}
```
Ici, `assistant_response` est un champ contenant la réponse au format JSON. Vous devez le parser si vous souhaitez utiliser la structure JSON renvoyée par GPT.
---
### 1.10 BIGQUERY (action = "BIGQUERY")
- **But** : exécuter une requête SQL sur BigQuery.
- **Requête** :
```json
{
  "action": "BIGQUERY",
  "sql_query": "SELECT * FROM ..."
}
```
- `sql_query` : contient le code SQL à exécuter.
**Réponse** :
Les résultats sont directement placés dans `results` sans `software_id`, `data_type` ni `description`. Chaque élément du tableau correspondra à une ligne retournée par BigQuery. Par exemple :
```json
{
  "success": true,
  "results": [
    {
      "col1": "valeur1",
      "col2": 123
    },
    {
      "col1": "valeur2",
      "col2": 456
    }
  ]
}
```
*(Ici, chaque objet dans `results` représente une ligne du jeu de résultats.)*

**ARCHITECTURE :**

**SERVER-SIDE ENCAPSULATION** : Toutes les interactions avec BigQuery doivent être effectuées exclusivement depuis le backend Next.js (API Routes ou Server Actions), jamais depuis le client. Utilisez des mécanismes appropriés comme les API Routes ou les Server Actions pour encapsuler cette communication externe.

**CLIENT-SERVER BOUNDARY** : Les composants frontend doivent appeler une API interne côté serveur pour accéder aux résultats BigQuery, sans inclure de logique SQL ou accès direct à l'API externe dans le code client.

**SÉCURITÉ** : Assurez-vous que les détails sensibles, tels que l'URL de l'endpoint externe et la logique spécifique de la requête de données, restent confinés à l'implémentation côté serveur et ne sont jamais exposés dans le navigateur du client ou inclus dans les bundles JavaScript côté client.
- Sécurité d'accès des rapports BI :
  - Générez un UUID v4 fixe pour chaque rapport dans un fichier de configuration (par exemple `550e8400-e29b-41d4-a716-446655440000`).
  - Configurez la route racine (`/`) pour rediriger ou afficher une page « Accès Refusé » si l'URL n'est pas complète.
  - Rendez le rapport accessible uniquement via la route `/rapport/{UUID}`.
  - Toute tentative d'accès à `/` ou à `/rapport/{UUID_incorrect}` doit renvoyer la page « Accès Refusé ». 
  - Fournissez aux utilisateurs l'URL complète `https://andon.rapport.com/rapport/{UUID}` pour accéder au rapport.

**TITRE DE L'ONGLET (BI)** : Si le projet est un rapport BI (Business Intelligence) ou s'y apparente, le titre de l'onglet du navigateur doit être défini sur `"Rapport - Intelligence Industrielle"`.

**CACHE :**
Les résultats de la requête SQL doivent être mis en cache localement via **IndexedDB**, et non **localStorage**.
**IndexedDB** permet de stocker de manière persistante de grands volumes de données (à la différence de **localStorage** qui est limité à 5 Mo).
Lors d'un appel BigQuery, la réponse peut être stockée dans **IndexedDB** avec une clé correspondant à un **hash de la requête SQL**. Sur les appels suivants, vérifiez d'abord **IndexedDB** avant d'interroger le serveur.
---
### 1.11 SEND_EMAIL (action = "SEND_EMAIL")
- **But** : envoyer un email à un ou plusieurs destinataires.
- **Requête** :
```json
{
  "action": "SEND_EMAIL",
  "recipients": "destinataire1@example.com,destinataire2@example.com",
  "cc": "cc1@example.com", // facultatif
  "bcc": "bcc1@example.com", // facultatif
  "subject": "Sujet de l'email",
  "body": "Contenu de l'email.",
  "body_type": "html" // "text" ou "html"
}
```
- `recipients` : chaîne de caractères contenant les adresses email des destinataires principaux, séparées par des virgules.
- `cc` (facultatif) : chaîne de caractères contenant les adresses email pour la copie carbone, séparées par des virgules.
- `bcc` (facultatif) : chaîne de caractères contenant les adresses email pour la copie carbone invisible, séparées par des virgules.
- `subject` : sujet de l'email.
- `body` : corps de l'email.
- `body_type` : spécifie le format du corps de l'email. Doit être `"text"` ou `"html"`.
**Réponse** (ex. réussite) :
```json
{
  "success": true,
  "results": [
    {
      "status": "Email envoyé avec succès"
    }
  ]
}
```
**Réponse** (ex. échec) :
```json
{
  "success": false,
  "results": [
    {
      "error": "Description de l'erreur (ex: Adresse invalide)"
    }
  ]
}
```
---
## 2. Endpoint de Transcription (Audio → Texte)
```
POST https://n8n.tools.intelligenceindustrielle.com/webhook/aa2a5214-16bc-4d13-a41e-d76d76eb0212
```
Cette route reçoit un fichier audio ou un champ `audio_url` et renvoie un **texte brut** (sans JSON) contenant la transcription.
### Conseils et configuration pour l'enregistrement audio
1. **Configuration MediaRecorder optimisée pour iOS**
- Mono (`channelCount: 1`)
- Fréquence d'échantillonnage : 44.1 kHz
- Bitrate réduit à 32 kbps via `audioBitsPerSecond: 32000`
- Traitement audio activé (echoCancellation, autoGainControl, noiseSuppression)
2. **Stratégie de buffering**
- Découpage en micro-chunks de 50 ms via `mediaRecorder.start(50)` pour éviter les problèmes de mémoire tampon sur Safari iOS.
3. **Détection dynamique du format**
- Évaluer le MIME type supporté par le navigateur
- Adapter automatiquement l'extension lors de l'envoi POST (webm / wav / mp4 / aac)
4. **Envoi FormData**
```javascript
formData.append('file', audioBlob, `recording_${timestamp}.${fileExtension}`);
fetch(endpoint, { method: 'POST', body: formData });
```
5. **Gestion timeout**
- Implémenter un `AbortController` avec un timeout de 30 s pour les environnements iOS instables.
**Avantage technique** : la combinaison du micro-buffering et du bitrate réduit contourne les limitations de WebKit sur iOS, tout en conservant une qualité suffisante pour les moteurs de transcription.
**Exemple** :
```
curl -X POST \
-F "file=@monAudio.wav" \
https://n8n.tools.intelligenceindustrielle.com/webhook/aa2a5214-16bc-4d13-a41e-d76d76eb0212
```
*(Réponse : texte brut.)*
L'idée est d'ajouter un bouton ou icône micro dans vos champs texte : lorsqu'on enregistre un audio, on l'envoie à cet endpoint puis on **ajoute** (sans remplacer) la transcription obtenue dans la zone de saisie.
---
## 3. Résumé et Exemples
**Endpoint principal** :
```
https://n8n.tools.intelligenceindustrielle.com/webhook/d2c3b9ea-debf-49e5-a911-f286a4394596
```
**Actions** :
- `"POST"` (créer dans MongoDB)
- `"GET_ALL"` (tout lire depuis MongoDB)
- `"GET_LAST"` (dernier document MongoDB)
- `"GET_NATURAL"` (langage naturel pour MongoDB)
- `"GET_MONGO"` (filtre Mongo direct)
- `"UPDATE"` (mettre à jour MongoDB, on envoie tout le `json_data`)
- `"DELETE"` (supprimer via un `record_id` ou un `mongo_filter`)
- `"ASK_GPT"` (question GPT, veillez à mentionner le format JSON attendu en réponse)
- `"BIGQUERY"` (exécuter une requête SQL ; la réponse place directement chaque ligne dans `results`)
- `"SEND_EMAIL"` (envoyer un email)
**Endpoint transcription** :
```
https://n8n.tools.intelligenceindustrielle.com/webhook/aa2a5214-16bc-4d13-a41e-d76d76eb0212
```
- Retourne du texte brut contenant la transcription.
### Exemples
- **Créer** un document :
```json
{
  "action": "POST",
  "software_id": "my_app",
  "data_type": "user_profile",
  "description": "Nouveau profil",
  "json_data": {
    "user": { "name": "Alice", "age": 25 },
    "status": "active"
  }
}
```
- **Obtenir tous** les documents :
```json
{
  "action": "GET_ALL",
  "software_id": "my_app",
  "data_type": "user_profile"
}
```
- **Obtenir le dernier** :
```json
{
  "action": "GET_LAST",
  "software_id": "my_app",
  "data_type": "user_profile"
}
```
- **Langage naturel (MongoDB)** :
```json
{
  "action": "GET_NATURAL",
  "software_id": "my_app",
  "data_type": "user_profile",
  "query_intent": "Tous les utilisateurs dont l'âge > 25"
}
```
- **Filtre Mongo** :
```json
{
  "action": "GET_MONGO",
  "software_id": "my_app",
  "data_type": "user_profile",
  "mongo_filter": {
    "json_data.user.age": { "$gt": 25 }
  }
}
```
- **Mettre à jour** par `record_id` :
```json
{
  "action": "UPDATE",
  "software_id": "my_app",
  "data_type": "user_profile",
  "record_id": "abc123",
  "json_data": {
    "user": { "name": "Alice", "age": 26 },
    "status": "archived"
  }
}
```
- **Supprimer** via `record_id` :
```json
{
  "action": "DELETE",
  "software_id": "my_app",
  "data_type": "user_profile",
  "record_id": "abc123"
}
```
- **Interroger GPT** :
```json
{
  "action": "ASK_GPT",
  "system_instruction": "Tu es un assistant JavaScript. Réponds toujours avec un JSON du type { 'explication': '...' }.",
  "prompt": "Quelle est la différence entre let et var ?"
}
```
**Exemple de réponse** :
```json
{
  "success": true,
  "results": [
    {
      "assistant_response": "{\"explication\": \"'let' a une portée de bloc, tandis que 'var' a une portée de fonction...'\"}"
    }
  ]
}
```
- **Requête BigQuery** :
```json
{
  "action": "BIGQUERY",
  "sql_query": "SELECT * FROM my_dataset.my_table LIMIT 3"
}
```
**Exemple de réponse** :
```json
{
  "success": true,
  "results": [
    {
      "col1": "valeur1",
      "col2": 123
    },
    {
      "col1": "valeur2",
      "col2": 456
    }
  ]
}
```
*(Chaque objet dans `results` est une ligne du jeu de résultats BigQuery.)*
- **Envoyer un email** :
```json
{
  "action": "SEND_EMAIL",
  "recipients": "alice@example.com",
  "cc": "bob@example.com",
  "bcc": "admin@example.com",
  "subject": "Mise à jour importante",
  "body": "<h1>Bonjour Alice,</h1><p>Ceci est un message important.</p>",
  "body_type": "html"
}
```
- **Envoyer un fichier audio** pour transcription :
```
curl -X POST \
-F "file=@monAudio.wav" \
https://n8n.tools.intelligenceindustrielle.com/webhook/aa2a5214-16bc-4d13-a41e-d76d76eb0212
```
*(Réponse : texte brut.)*
---
En suivant ces indications, vous pouvez implémenter un CRUD complet (MongoDB), des requêtes GPT, des requêtes BigQuery et la transcription audio dans votre application, le tout via deux endpoints faciles à configurer.