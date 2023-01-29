/**
 * Import client, and all db functions from the index.js file
 */
const {
  client,
  createReport,
  closeReport,
  getOpenReports,
  createReportComment
} = require('./index');

/**
 * You need to drop the tables for comments and reports,
 * if they exist, and in that order.
 */
async function dropTables() {
  try {
    console.log('Starting to drop tables...');
    
    client.query(`
      DROP TABLE IF EXISTS comments;
      DROP TABLE IF EXISTS reports;
    `);

    console.log('Finished dropping tables!');
  } catch (error) {
    console.error('Error while dropping tables!');

    throw error;
  }
}

/**
 * You need to build the reports and comments tables,
 * in that order.
 */
async function buildTables() {
  try {
    console.log('Starting to construct tables...');

    await client.query(`
      CREATE TABLE reports(
        id SERIAL PRIMARY KEY,
        title varchar(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        password VARCHAR(255) NOT NULL,
        "isOpen" BOOLEAN DEFAULT true,
        "expirationDate" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + interval '1 day'
      );

      CREATE TABLE comments(
        id SERIAL PRIMARY KEY,
        "reportId" INTEGER REFERENCES reports(id),
        content TEXT NOT NULL
      );
    `);

    console.log('Finished constructing tables!');
  } catch (error) {
    console.error('Error constructing tables!');

    throw error;
  }
}

/**
 * Do not change this code!
 */
async function rebuildDB() {
  try {

    await dropTables();
    await buildTables();
  } catch (error) {
    throw error;
  }
}

/**
 * Do not change this code!
 */
async function createInitialReports() {
  try {
    console.log('Trying to create reports...');

    const reportOne = await createReport({
      title: 'ET spotted outside of Area 51',
      location: 'Roswell, NM',
      description: 'I saw what can only be described as a very slender, very tall humanoid walking behind the fences at...',
      password: '51isTheKey'
    });

    const reportTwo = await createReport({
      title: 'Fairy lights in my backyard',
      location: 'Utica, NY',
      description: 'I saw floating lights in my backyard... on inspection they weren\'t fireflies...',
      password: 'iLoveF4ri3s'
    });

    const reportThree = await createReport({
      title: 'Corner of metal object sticking up out of the ground in the woods...',
      location: 'Haven, Maine',
      description: 'Late last night and the night before\n Tommyknockers, Tommyknockers\n knocking at the door',
      password: 'kingwasright'
    })

    console.log('Success creating reports!');

    return [reportOne, reportTwo, reportThree]
  } catch (error) {
    console.error('Error while creating reports!');
    throw (error);
  }
}

/**
 * Do not change this code!
 */
async function createInitialComments(initialReports) {
  const [reportOne, reportTwo] = initialReports;

  try {
    console.log("Trying to create comments...");

    const commentOne = await createReportComment(reportOne.id, {
      content: "I saw that, too... let's meet up to discuss"
    });

    const commentTwo = await createReportComment(reportTwo.id, {
      content: "Look, I believe in a lot of things but are fairy lights even real?"
    });
    
    const commentThree = await createReportComment(reportTwo.id, {
      content: "Hey, don't question the report. Question the government! They've been lying to us all these years."
    });

    console.log("Success creating comments!");

    return [commentOne, commentTwo, commentThree];
  } catch(error) {
    console.log("Failure creating comments!")
    throw error;
  }
}

/**
 * Function made to forcefully expire a report, only for testing.
 * 
 * This would not be necessary for our DB Adapter
 */
async function expireReport(reportId) {
  try {
    const { rows: [report] } = await client.query(`
      UPDATE reports
      SET "expirationDate" = CURRENT_TIMESTAMP - interval '5 days'
      WHERE id=$1
      RETURNING *;
    `, [reportId]);

    return report;
  } catch (error) {
    throw error;
  }
}

/**
 * Only comment/uncomment these lines as you're building your
 * Database adapter functions.
 */
async function testDB() {
  try {
    console.log("Filling DB with initial data");
    
    const reports = await createInitialReports();
    await createInitialComments(reports);
    
    console.log("Filled! Now executing basic commands...")

    /* These lines should always work */
    console.log("Getting open reports:\n", await getOpenReports());
    console.log("Closing report with id 1 with correct password", await closeReport(1, "51isTheKey"));
    console.log("Expiring report with id 3", await expireReport(3));
    console.log("Grabbing all open reports:\n", await getOpenReports());
    
    /* Each of these lines should throw an error when uncommented */

    
    // console.log("Closing report with id 1 even though it is closed", await closeReport(1, "51isTheKey"));
    // console.log("Closing report with id 2 with incorrect password", await closeReport(2, "bad password"));
    // console.log("Closing report with id 300 even though it doesn't exist", await closeReport(300, "does not matter"));
    // console.log("Commenting on closed report", await createReportComment(1, { content: "should we meet up and chat?" }));
    // console.log("Commenting on expired report", await createReportComment(3, { content: "you read too much" })); 
    // console.log("Creating report with missing info", await createReport({ title: "abc", location: "abc", description: "abc" }));

    console.log("Finished filling DB!");
  } catch (error) {
    throw error;
  }
}

module.exports = {
  rebuildDB,
  testDB
}