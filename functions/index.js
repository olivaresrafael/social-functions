const functions = require("firebase-functions");
const express = require("express");
const app = express();
const { db } = require("./util/admin");
const cors = require("cors");

app.use(cors());

// Next Function Auth
const { FBAuth } = require("./util/fbAuth");

// Functions API
const {
  getAllScreams,
  postOneScream,
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream,
  deleteScream,
} = require("./handlers/screams");

const {
  signup,
  login,
  uploadImage,
  addUserDetail,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
  addTokenDevice,
} = require("./handlers/users");
const admin = require("./util/admin");

//Scream routes
app.get("/screams", getAllScreams);
app.post("/screams", FBAuth, postOneScream);
app.get("/scream/:screamId", getScream);
app.post("/scream/:screamId/comment", FBAuth, commentOnScream);
app.delete("/scream/:screamId", FBAuth, deleteScream);
app.get("/scream/:screamId/like", FBAuth, likeScream);
app.get("/scream/:screamId/unlike", FBAuth, unlikeScream);
//User routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user", FBAuth, addUserDetail);
app.get("/user/:FCMtoken/token", FBAuth, addTokenDevice);
app.get("/user", FBAuth, getAuthenticatedUser);
app.post("/user/image", FBAuth, uploadImage);
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationsRead);

// https://baseurl.com/api/screams
exports.api = functions.https.onRequest(app);
// Notifications on Likes
exports.createNotificationOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate(async (snapshot) => {
    db.doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then(async (doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          await db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "like",
            read: false,
            screamId: doc.id,
          });
          let userData = await db.doc(`/users/${doc.data().userHandle}`).get();
          console.log(userData.data());
          if (userData.data().FCMtokens) {
            console.log("existe");
            var message = {
              data: {
                sender: snapshot.data().userHandle,
                action: "like",
                createdAt: new Date().toISOString(),
                content: doc.id,
              },
              token: userData.data().FCMtokens[0],
            };
            // Send a message to the device corresponding to the provided
            // registration token.
            admin.admin
              .messaging()
              .send(message)
              .then((response) => {
                // Response is a message ID string.
                console.log("Successfully sent message:", response);
              })
              .catch((error) => {
                console.log("Error sending message:", error);
              });
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

// Delete Notification on Unlike
exports.deleteNotificationOnUnlike = functions.firestore
  .document("likes/{id}")
  .onDelete(async (snapshot) => {
    try {
      await db.doc(`/notifications/${snapshot.id}`).delete();
      return;
    } catch (err) {
      console.error(err);
      return;
    }
  });

// Notifications on Comments
exports.createNotificationOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate(async (snapshot) => {
    db.doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then(async (doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          await db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            screamId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

//Update userImage in every document
exports.onUserImageChange = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change) => {
    let imageBefore = change.before.data().imageUrl;
    let imageAfter = change.after.data().imageUrl;
    let handle = change.before.data().handle;
    if (imageBefore !== imageAfter) {
      let batch = db.batch();
      const screamsData = await db
        .collection("screams")
        .where("userHandle", "==", handle)
        .get();
      screamsData.forEach((doc) => {
        const scream = db.doc(`/screams/${doc.id}`);
        batch.update(scream, { userImage: imageAfter });
      });
      const commentsData = await db
        .collection("comments")
        .where("userHandle", "==", handle)
        .get();
      commentsData.forEach((doc) => {
        const comment = db.doc(`/comments/${doc.id}`);
        batch.update(comment, { userImage: imageAfter });
      });
      return batch.commit();
    }
  });

exports.onDeleteScream = functions.firestore
  .document("screams/{screamId}")
  .onDelete(async (snapshot, context) => {
    let batch = db.batch();
    const screamId = context.params.screamId;
    const likesData = await db
      .collection("likes")
      .where("screamId", "==", screamId)
      .get();
    likesData.forEach((doc) => {
      batch.delete(db.doc(`/likes/${doc.id}`));
    });

    const commentsData = await db
      .collection("comments")
      .where("screamId", "==", screamId)
      .get();
    commentsData.forEach((doc) => {
      batch.delete(db.doc(`/comments/${doc.id}`));
    });

    const notificationsData = await db
      .collection("notifications")
      .where("screamId", "==", screamId)
      .get();
    notificationsData.forEach((doc) => {
      batch.delete(db.doc(`/notifications/${doc.id}`));
    });
    return batch.commit();
  });
