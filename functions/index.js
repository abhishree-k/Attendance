// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.onAttendanceWrite = functions.firestore
  .document('attendance/{date}/class_{classId}/{studentId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null;
    if (after.status !== 'absent') return null; // only alert on absent

    const { studentId } = context.params;
    const date = context.params.date;

    // Fetch student (expects contact.parentUid)
    const studentSnap = await admin.firestore().collection('students').doc(studentId).get();
    if (!studentSnap.exists) return null;
    const student = studentSnap.data();
    const parentUid = student?.contact?.parentUid;
    if (!parentUid) return null;

    // Get parent tokens
    const tokenDoc = await admin.firestore().collection('fcmTokens').doc(parentUid).get();
    const tokens = tokenDoc.exists ? (tokenDoc.data().tokens || []) : [];
    if (!tokens.length) return null;

    const notification = {
      title: 'Absence Alert',
      body: `${student.name || 'Student'} marked ABSENT on ${date}`
    };

    await admin.messaging().sendEachForMulticast({
      tokens,
      notification,
      data: {
        date,
        studentId,
        classId: context.params.classId,
        status: 'absent'
      }
    });

    return null;
  });
