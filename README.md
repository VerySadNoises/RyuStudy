# Chapitre · Study Studio

Chapitre est une PWA de rédaction universitaire pour iPhone. Elle réunit devoirs, suivi de rédaction, obligations, tâches, notes, objectifs, minuteur Pomodoro et historique. L’interface emploie les libellés anglais du cahier des charges. Matcha est le thème initial. Les cinq thèmes ont aussi une variante nuit.

## Démarrer sur ordinateur

Décompressez le ZIP. Dans le dossier `chapitre`, lancez Python 3, puis ouvrez [http://localhost:8000/](http://localhost:8000/).

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Sur macOS ou Linux, utilisez `python3` si nécessaire. L’application est servie directement. Elle ne requiert ni compilation, ni installation de paquets, ni serveur applicatif. Le lancement par double-clic sur `index.html` ne permet pas d’utiliser le service worker. Un iPhone connecté au même réseau doit utiliser une URL HTTPS valide, car une adresse IP locale en HTTP n’est pas assimilée à `localhost`. [Contextes sécurisés, MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)

### Polices

La version fournie utilise les polices système hors ligne. L’environnement de réalisation n’a pas pu télécharger les trois fontes demandées. Pour inclure Fredoka, Noto Sans et Roboto Mono, exécutez la commande suivante une seule fois, avec accès Internet, avant de publier. Le script récupère les fontes et leurs licences à partir du dépôt Google Fonts, puis ajoute les fichiers locaux au cache de la PWA. L’application installée charge uniquement ces copies locales. [Fredoka](https://fontsource.org/fonts/fredoka/use) · [Noto Sans](https://fontsource.org/fonts/noto-sans/use) · [Roboto Mono](https://fontsource.org/fonts/roboto-mono/use)

```sh
python tools/install-fonts.py
```

## Publier en HTTPS

1. Créez un dépôt GitHub dédié. Placez les fichiers de `chapitre` à la racine de la branche `main`, y compris `.nojekyll`. Les dossiers `tests` et `tools` peuvent rester locaux. Gardez vos sauvegardes JSON avec vos données personnelles en dehors du dépôt.
2. Dans **Settings → Pages**, choisissez **Deploy from a branch**, puis **main → /(root)** et enregistrez. Activez **Enforce HTTPS** lorsque l’option est disponible.
3. Ouvrez l’URL HTTPS affichée dans **Pages**. Le site utilise des chemins relatifs et fonctionne aussi sous le chemin du dépôt. Pour une publication temporaire, vous pouvez retirer la publication après vos essais. Conservez l’URL pour pouvoir réinstaller l’application ou recevoir des mises à jour. [Publication GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) · [HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

## Installer sur iPhone

1. Dans Safari, ouvrez l’URL HTTPS. Dans le menu de partage, choisissez **Ajouter à l’écran d’accueil**. Activez **Ouvrir comme app web** si iOS affiche cette option, puis touchez **Ajouter**. [Guide Apple](https://support.apple.com/en-az/guide/iphone/iphea86e5236/26/ios/26)
2. Ouvrez **Chapitre** depuis sa nouvelle icône pendant que l’iPhone est encore en ligne. Entrez votre prénom dans cette instance, ou choisissez **Restore a backup**.
3. Ouvrez **Settings → Data** et attendez **Offline cache ready**. Fermez l’application, activez le mode avion et relancez-la depuis l’icône.
4. Pour sauvegarder vos données, ouvrez **Settings → Data → Export JSON**. Si le partage de fichiers est disponible, choisissez **Save to Files** dans Chapitre puis **Enregistrer dans Fichiers** dans la feuille iOS. Sélectionnez **Sur mon iPhone** ou **iCloud Drive**. Sinon, utilisez **Download JSON** et retrouvez le fichier dans les téléchargements ou dans Fichiers.

Sur iOS, le système peut suspendre l’application ou supprimer son stockage local selon ses règles. Chapitre demande le stockage persistant, affiche le résultat et rappelle l’export après une semaine. Les sauvegardes JSON peuvent contenir des informations personnelles et sont lisibles en clair. L’application ne synchronise pas les données. [Politique de stockage WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/)

Le minuteur recalcule son état à partir des horodatages quand l’application revient au premier plan. Si la durée s’est écoulée sous verrouillage, le bilan est disponible au retour. Pour une alerte sonore sous verrouillage, utilisez aussi le minuteur de l’app Horloge d’iOS.

## Utiliser le suivi de rédaction

- Le pourcentage global utilise 70 % d’atteinte de l’objectif de mots et 30 % d’obligations requises terminées. Les deux composantes plafonnent à 100 %. Sans obligation, les mots forment la totalité du calcul. La progression reste sous 100 % tant qu’un critère manque. Les tâches facultatives ne comptent pas.
- **Adjust words** remplace le total actuel. **Session review** ajoute des mots nouveaux une seule fois, à la confirmation. Si des mots ont déjà été inclus manuellement dans le total, saisissez 0 pour ces mots dans le bilan. Les chiffres de l’historique et les objectifs quotidiens et hebdomadaires comptent les mots des sessions enregistrées.
- Les semaines commencent le lundi. Une session appartient au jour local où elle a commencé. Sur le calendrier, la catégorie ayant cumulé le plus de temps colore la case. En cas d’égalité, le nom départage les catégories, puis leur identifiant. Le détail du jour affiche toutes les catégories.
- **Submit** devient disponible après avoir atteint 100 %. L’archivage est proposé après acceptation. Un devoir peut être désarchivé ou rouvert. Supprimer un devoir retire ses tâches, notes, et objectifs hebdomadaires. Ses sessions restent accessibles dans l’historique sous le titre enregistré.
- Restaurer un fichier remplace toutes les données après validation, résumé et confirmation. Les références, dates, types et doublons sont contrôlés. Les sauvegardes peuvent atteindre 25 Mo.

## Structure et mises à jour

| Fichier ou dossier | Contenu |
| --- | --- |
| `index.html`, `styles.css`, `fonts.css` | Interface responsive, thèmes, styles et fontes locales |
| `js/app.js`, `js/ui.js` | Navigation, gestion des erreurs et composants DOM |
| `js/model.js`, `js/db.js`, `js/backup.js` | Modèle, IndexedDB versionnée et validation JSON |
| `js/assignments.js`, `js/pomodoro.js`, `js/timer.js` | Devoirs, tâches, notes, objectifs et sessions |
| `js/settings.js`, `js/visuals.js` | Réglages, sauvegardes et statistiques |
| `assets/`, `manifest.webmanifest` | Chat, icônes PNG, métadonnées d’installation |
| `service-worker.js`, `font-assets.js` | Mise en cache des ressources statiques |
| `tests/core.test.mjs`, `VERIFICATION.md` | Tests automatisés et protocole sur appareil |

Les dates calendaires sont des chaînes `AAAA-MM-JJ`, distinctes des horodatages UTC ISO. IndexedDB contient huit collections et utilise des identifiants stables. L’enregistrement d’une session, ses mots et ses objectifs se valident dans une transaction. Le bilan lui-même est enregistré en cours de saisie. Le service worker stocke uniquement des ressources statiques.

À chaque changement de ressources, incrémentez `v1` dans `service-worker.js`. Actualisez la liste des fichiers si l’arborescence a changé. Publiez à la **même origine HTTPS**, puis fermez les fenêtres Chapitre pour permettre au nouveau worker de prendre le relais. Pour faire évoluer IndexedDB, ajoutez une migration dans `js/db.js` et incrémentez la version sans supprimer la base. Une nouvelle origine, par exemple un autre domaine ou port, dispose de son propre stockage. Utilisez un export et un import pour y transférer les données.

## Vérifications

```sh
node --test tests/core.test.mjs
```

Les six tests automatisés ont été exécutés avec Node.js 24. Ils couvrent les calculs, les horodatages du minuteur, la prévention du double comptage, les agrégations, la validation JSON et le cache dans un environnement simulé. Suivez [VERIFICATION.md](VERIFICATION.md) pour les contrôles dans Safari et en mode autonome.
