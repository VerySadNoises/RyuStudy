# Protocole de vérification sur iPhone

Utilisez un iPhone de test, l’URL HTTPS du projet et une sauvegarde de vos éventuelles données réelles. L’installation iOS et les parcours ci-dessous restent à exécuter sur appareil. Les six tests Node du fichier `tests/core.test.mjs` ont été exécutés avec succès. Le test de service worker utilise un cache simulé. Le navigateur de test local n’a pas pu démarrer dans l’environnement de réalisation.

| Parcours | Manipulation | Résultat attendu |
| --- | --- | --- |
| Installation autonome | Dans Safari, ajoutez Chapitre à l’écran d’accueil, activez l’option app web si disponible, ouvrez depuis l’icône | L’écran d’accueil s’ouvre sans barre d’adresse et respecte l’encoche et l’indicateur d’accueil |
| Premier lancement | Vérifiez **Welcome!**, entrez `Camille`, validez | Home affiche **Hi, Camille!** |
| Profil et réouverture | Fermez complètement l’app, relancez depuis l’icône, puis renommez le profil dans Settings et relancez | Le nom initial puis le nom modifié persistent, l’accueil de bienvenue ne revient pas |
| Création | Créez `History Essay`, matière `History`, échéance demain, 1 000 mots, obligation `Bibliography` | Le détail s’ouvre. Home affiche l’échéance, le délai et 0 % |
| Édition | Changez le titre en `Modern History`, mettez l’échéance à aujourd’hui, quittez puis rouvrez le détail | Le titre et l’échéance sont conservés. Le tri Home place le devoir avant une échéance plus tardive |
| Thème | Sélectionnez Lavender puis Night. Fermez, relancez, choisissez une autre couleur et Auto | Le thème change sur place et persiste. Auto se base sur l’heure locale |
| Tâches | Ajoutez `Find sources` avec échéance, éditez-la, cochez-la, puis ouvrez un autre écran et revenez | Le texte, la date et le statut Done persistent |
| Notes | Tapez `Read the introduction` et attendez l’indication Saved. Quittez puis rouvrez l’app | Le texte est conservé |
| Objectifs | Dans le devoir, choisissez 500 mots pour la semaine et planifiez Bibliography. Dans Pomodoro, choisissez 200 mots et ajoutez `Outline` pour aujourd’hui | Les deux périodes sont distinctes et leurs checklists sont conservées |
| Sélection Pomodoro | Depuis le détail, touchez Start Working. Choisissez Writing et 1 minute, puis Start | Le devoir est présélectionné, le chat s’anime et le minuteur démarre à 00:01:00 |
| Pause et reprise | Après quelques secondes, touchez Pause et attendez 10 s. Touchez Resume, travaillez quelques secondes, puis Stop | L’affichage est stable durant la pause. Le bilan indique le temps actif, hors pause |
| Sauvegarde et doublon | Entrez 200 mots, cochez Outline, ajoutez une note et touchez deux fois **Yes, save session** rapidement | Une seule ligne apparaît dans History. Le devoir a 200 mots et Outline est terminé |
| Progression | Pour 200 / 1 000 mots et une obligation ouverte, vérifiez 14 %. Cochez Bibliography, puis ajustez le total à 1 000 | 44 % après l’obligation et 100 % après l’ajustement. Les mots historiques restent à 200 |
| Soumission et archive | Touchez Submit, annulez, puis confirmez. Archivez depuis la fenêtre de félicitations | L’annulation conserve l’état. La confirmation affiche le chat, puis le devoir se retrouve dans Archived |
| Calendrier | Ouvrez la case du jour dans le devoir et vérifiez la catégorie, la durée et les 200 mots. Touchez une case neutre | Le jour travaillé détaille la session. La case neutre affiche zéro activité |
| Historique | Ouvrez History et choisissez Today. Ouvrez la ligne de session. Vérifiez ses détails et les agrégats | Les totaux correspondent aux durées, mots et catégories enregistrés |
| Rechargement pendant un timer | Lancez 1 min dans Safari, actualisez après 10 s. En mode autonome, fermez l’app après 10 s et relancez avant expiration | Le temps restant correspond à l’horloge. Le timer conserve le devoir et la catégorie |
| Expiration sous verrouillage | Démarrez 1 min, verrouillez l’iPhone 75 s et rouvrez l’app | En revenant à Pomodoro, un seul bilan indique 1 min de travail |
| Bilan en cours | Saisissez 123 mots et une note dans le bilan. Fermez puis relancez et ouvrez Pomodoro | Les champs du bilan persistent et la session attend toujours la confirmation |
| Arrêt sans enregistrer | Lancez un timer, arrêtez-le puis choisissez **No, discard** | Aucune session supplémentaire ni ajout de mots |
| Pauses | Réglez la pause courte à 1 min, coupez les rappels puis démarrez la pause | La pause expire et ne crée aucune session de travail |
| Export JSON | Ouvrez Settings → Data, exportez et enregistrez dans Fichiers. Vérifiez le fichier, le profil, le devoir et la session | Le JSON est accessible dans Fichiers et la date de l’export apparaît dans Data |
| Import et confirmation | Modifiez le nom. Lancez un import du fichier exporté. Lisez le résumé, annulez, puis relancez et confirmez | Le nom modifié persiste après annulation. La confirmation charge le profil, les sessions et les autres données du fichier |
| Import invalide | Sur une copie du fichier, remplacez `"version": 1` par `"version": 99` et importez | Message d’erreur, bouton de poursuite désactivé, données locales conservées |
| Hors ligne | Attendez **Offline cache ready**, fermez l’app, activez le mode avion et coupez le Wi-Fi. Rouvrez depuis l’icône | L’interface, le chat, les devoirs, l’historique et le minuteur chargent. Créez une tâche et rouvrez l’app en restant hors ligne pour vérifier sa sauvegarde |
| Redémarrage de l’iPhone | Après une sauvegarde externe, redémarrez l’iPhone puis ouvrez Chapitre depuis l’icône | Les données locales sont présentes si iOS a conservé le stockage de Chapitre |
| Mise à jour du cache | Exportez, publiez au même endroit après avoir modifié le titre HTML et incrémenté la version du cache. Ouvrez l’app en ligne, fermez toutes les fenêtres puis rouvrez | Le nouveau titre est visible dans Safari. Le profil, les tâches, les notes et les sessions sont conservés. Le mode avion fonctionne après la mise à jour |
| Migration IndexedDB | Sur une origine de test, installez une version de la base avec `VERSION = 1`, créez des données. Publiez la version livrée au même endroit et rouvrez après activation du nouveau cache | La base passe à la version 2, les nouveaux index existent, toutes les données restent accessibles |
| Accessibilité et petit écran | Testez un écran étroit, le clavier ouvert, VoiceOver et la préférence Réduire les animations. Parcourez les formulaires et utilisez Retour | Pas de défilement horizontal ni zoom forcé des champs. Les commandes sont nommées. Les champs restent atteignables au clavier |
| Effacement | Sur l’origine de test, déclenchez Reset application. Annulez une première fois puis confirmez lors de la seconde tentative | L’annulation conserve les données. La confirmation revient à Welcome. L’import du JSON restaure le test |
