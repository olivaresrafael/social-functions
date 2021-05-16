const { db } = require("../util/admin");

//Get All Screams
exports.getAllScreams = (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let screams = [];
      data.forEach((doc) => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          userImage: doc.data().userImage,
        });
      });
      return res.json(screams);
    })
    .catch((err) => console.error(err));
};
//Get one scream
exports.getScream = (req, res) => {
  let screamData = [];
  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Scream not found" });
      }
      screamData = doc.data();
      screamData.screamId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("screamId", "==", req.params.screamId)
        .get();
    })
    .then((data) => {
      screamData.comments = [];
      data.forEach((comment) => {
        screamData.comments.push(comment.data());
      });
      return res.json({ screamData });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//Post one Scream
exports.postOneScream = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Must not be empty" });
  }
  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    userImage: req.user.userImage,
    likeCount: 0,
    commentCount: 0,
  };
  db.collection("screams")
    .add(newScream)
    .then((doc) => {
      newScream.screamId = doc.id;
      return res.json(newScream);
    })
    .catch((err) => {
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
};
//Post new comment
exports.commentOnScream = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Must not be empty" });
  }

  const newComment = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userImage: req.user.userImage,
  };

  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  screamDocument
    .get()
    .then(async (doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Scream not found" });
      }

      let commentCountData = doc.data().commentCount;
      commentCountData++;

      await db.collection("comments").add(newComment);
      await screamDocument.update({ commentCount: commentCountData });

      return res.json(newComment);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//Give like scream
exports.likeScream = (req, res) => {
  const newLike = {
    screamId: req.params.screamId,
    userHandle: req.user.handle,
  };
  let screamData = {};

  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  const likeDocument = db
    .collection("likes")
    .where("screamId", "==", req.params.screamId)
    .where("userHandle", "==", req.user.handle)
    .limit(1);

  screamDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Scream not found" });
      }
      screamData = doc.data();
      return likeDocument.get();
    })
    .then(async (data) => {
      if (data.empty) {
        await db.collection("likes").add(newLike);

        screamData.likeCount++;
        await screamDocument.update({ likeCount: screamData.likeCount });

        return res.json({ message: "like was successfully" });
      } else {
        res.status(404).json({ error: "Like already exist" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
//Remove Like from scream
exports.unlikeScream = (req, res) => {
  let screamData = {};

  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  const likeDocument = db
    .collection("likes")
    .where("screamId", "==", req.params.screamId)
    .where("userHandle", "==", req.user.handle)
    .limit(1);

  screamDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Scream not found" });
      }
      screamData = doc.data();
      return likeDocument.get();
    })
    .then(async (data) => {
      if (data.empty) {
        res.status(404).json({ error: "Like not exist" });
      } else {
        await db.doc(`/likes/${data.docs[0].id}`).delete();
        screamData.likeCount--;
        await screamDocument.update({ likeCount: screamData.likeCount });
        return res.json({ message: "like was remove" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.deleteScream = (req, res) => {
  const document = db.doc(`/screams/${req.params.screamId}`);
  document
    .get()
    .then(async (doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Scream not exist" });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      await document.delete();
      return res.json({ message: "Scream wes deleted" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
