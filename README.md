# `firebase-functions-court-booking`

---

## O projektu

Ta repozitorij vsebuje strežniške (serverless) funkcije, ki poganjajo sistem za **rezervacijo športnih igrišč**, zgrajen z uporabo **Firebase Functions**. Aplikacija omogoča uporabnikom, da rezervirajo igrišča, medtem ko sistem avtomatizira preverjanje razpoložljivosti, obveščanje in upravljanje rezervacij.

## Ključne funkcionalnosti

* **Oddaja in preverjanje rezervacij:** Uporabniki lahko oddajo prošnje za rezervacijo. Sistem avtomatsko preveri razpoložljivost in zazna morebitne konflikte.
* **Potrditev in obveščanje:** Administratorji lahko potrdijo ali zavrnejo rezervacije. Uporabniki so o tem avtomatsko obveščeni.
* **Opomniki:** Sistem pošilja opomnike uporabnikom pred začetkom rezerviranega termina, da prepreči pozabljene rezervacije.
* **Arhiviranje in poročanje:** Stare rezervacije se avtomatsko arhivirajo, generirajo pa se tudi poročila o zasedenosti igrišč za boljšo analizo uporabe.

---

## Tehnologije

* **Firebase Functions:** Glavno orodje za implementacijo FaaS (Functions as a Service).
* **Firebase Firestore:** NoSQL podatkovna baza za shranjevanje informacij o igriščih, rezervacijah in uporabnikih.
* **Firebase Storage:** Za shranjevanje generiranih dokumentov, kot so PDF potrdila.
* **Firebase Authentication:** Za varno avtentikacijo uporabnikov in administratorjev.
* **Firebase Cloud Messaging (FCM):** Za pošiljanje notifikacij in sporočil uporabnikom in administratorjem.

---

## Nastavitev in zagon (lokalno)

Sledi tem korakom za nastavitev in zagon projekta na tvojem lokalnem okolju:

1.  **Kloniraj repozitorij:**
    ```bash
    git clone [https://github.com/tvoje-uporabnisko-ime/firebase-functions-court-booking.git](https://github.com/tvoje-uporabnisko-ime/firebase-functions-court-booking.git)
    cd firebase-functions-court-booking
    ```
2.  **Namesti odvisnosti:**
    ```bash
    npm install
    # ali yarn install, če uporabljaš Yarn
    ```
3.  **Namesti Firebase CLI:**
    Če še nimaš, namesti Firebase Command Line Interface globalno:
    ```bash
    npm install -g firebase-tools
    ```
4.  **Prijavi se v Firebase:**
    ```bash
    firebase login
    ```
5.  **Inicializiraj Firebase projekt:**
    Poveži svoj lokalni projekt z obstoječim Firebase projektom. Sledi navodilom v ukazni vrstici in izberi 'Functions', 'Firestore', 'Storage' in 'Hosting' (če boš uporabljal tudi spletno stran).
    ```bash
    firebase init
    ```
6.  **Zaženi Firebase Emulators:**
    Za lokalno testiranje funkcij in interakcijo z drugimi Firebase storitvami zaženi emulatorje:
    ```bash
    firebase emulators:start
    ```
    Po zagonu boš lahko dostopal do emulatorjev v svojem brskalniku na `localhost:4000`.

---

## Uvedba (Deployment)

Ko so funkcije pripravljene za produkcijo, jih uvedi na Firebase:

```bash
firebase deploy --only functions
