# Cloud Firestore Security Rules (Production)

As specified in Section 10 of the implementation plan, these rules restrict each user's access strictly to their own records using their authenticated Firebase `request.auth.uid`.

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: checks if request is authenticated and matches userId
    function ownsAccount(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    // User profile document
    match /users/{userId} {
      allow read, create, update: if ownsAccount(userId);
      allow delete: if false;

      // Realtime Sync Database subcollection
      match /sync/{document=**} {
        allow read, write: if ownsAccount(userId);
      }

      // Granular collection items
      match /transactions/{txId} {
        allow read, write: if ownsAccount(userId);
      }

      match /accounts/{accId} {
        allow read, write: if ownsAccount(userId);
      }

      match /budgets/{budgetId} {
        allow read, write: if ownsAccount(userId);
      }

      match /vehicles/{vehicleId} {
        allow read, write: if ownsAccount(userId);
      }

      match /loans/{loanId} {
        allow read, write: if ownsAccount(userId);
      }
    }

    // Deny all other collections by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## How to Deploy in Firebase Console:
1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select your project -> **Firestore Database** -> **Rules** tab.
3. Replace existing rules with the above snippet.
4. Click **Publish**.
