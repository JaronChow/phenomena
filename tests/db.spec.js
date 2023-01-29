require('dotenv').config();

const { rebuildDB } = require('../db/seed_data');
const { client, createReport, getOpenReports, _getReport, closeReport, createReportComment } = require('../db');

let reportIdToCreate, reportIdToClose;
describe('Database', () => {
  const testComment = 'Did the humanoid eat colorful candy?';
  let testReportForComments, reportIdForComments;
  beforeAll(async() => {
    await client.connect();
    await rebuildDB();
  })
  afterAll(async() => {
    await client.end();
  })
  describe('Reports', () => {
    let testReport, testReportToClose, reports, singleReport;
    describe('createReport', () => {
      beforeAll(async() => {
        testReport = await createReport({
          title: 'Bubbling Water',
          location: 'Bermuda',
          description: 'The ship seemed to disappear as it floated through this triangle.',
          password: 'ShipIsNoMore'
        });
        reportIdToCreate = testReport.id;
        testReportToClose = await createReport({
          title: 'Floating Being',
          location: 'My Attic',
          description: 'I saw it, turned away, then when I turned back, it was no more',
          password: 'GhostbustersNeeded'
        });
        reportIdToClose = testReportToClose.id;
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() - 1); 
        await client.query(`
          UPDATE reports
          SET "expirationDate"='${expirationDate.toISOString()}'
          WHERE id=$1;
        `, [reportIdToClose]);

      })
      it('Returns an object', async () => {
        expect(typeof testReport).toBe('object');
      });
      it('Does NOT return the password', async () => {
        expect(testReport.password).toBe(undefined);
      });
      it('report object contains id, title, location, description, isOpen, expirationDate', async () => {
        expect(testReport).toEqual(expect.objectContaining({
          id: expect.any(Number),
          title: expect.any(String),
          location: expect.any(String),
          description: expect.any(String),
          isOpen: expect.any(Boolean),
          expirationDate: expect.any(Date),
        }));
      });
    });
    describe('getOpenReports', () => {
      beforeAll(async() => {
        await client.query(`
          INSERT INTO comments("reportId", content)
          values($1, $2)
          RETURNING *
        `, [reportIdToCreate, testComment]);
        reports = await getOpenReports();
        [singleReport] = reports.filter(report => report.id === reportIdToCreate);
        [expiredReport] = reports.filter(report => report.id === reportIdToClose);
      })
      it('Returns an array', async () => {
        expect(Array.isArray(reports)).toBe(true);
      });
      it('Returns more than one report', async () => {
        expect(reports.length).toBe(2);
      });
      it('Array contains objects', async () => {
        expect(typeof singleReport).toBe('object');
      });
      it('individual report objects contain id, title, location, description, password, isOpen, expirationDate', async () => {
        expect(singleReport).toEqual(expect.objectContaining({
          id: expect.any(Number),
          title: expect.any(String),
          location: expect.any(String),
          description: expect.any(String),
          isOpen: expect.any(Boolean),
          expirationDate: expect.any(Date),
          isExpired: expect.any(Boolean),
        }));
      });
      it('isExpired is false if the expirationDate is now or later', async () => {
        expect(singleReport.isExpired).toBe(false);
      });
      it('isExpired is true if the expirationDate is before now', async () => {
        expect(expiredReport.isExpired).toBe(true);
      });
      it('individual report objects include the comments', async () => {
        expect(singleReport).toEqual(expect.objectContaining({
          comments: expect.any(Array),
        }));
        const {comments: [firstComment]} = singleReport;
        expect(firstComment.content).toEqual(testComment);
      });
    });
    describe('_getReport helper function', () => {
      let report;
      beforeAll(async() => {
        report = await _getReport(reportIdToCreate);
      })
      it('SELECTs and returns the report with id equal to reportId', async () => {
        expect(report.id).toEqual(reportIdToCreate);
      });
      
    })
    describe('closeReport', () => {
      let message, report;
      beforeAll(async() => {
      })
      it('If report doesnt exist, throws an error with a useful message', async () => {
        await expect(closeReport(300)).rejects.toThrow('Report does not exist with that id');
      });
      it('If the passwords dont match, throws an error', async () => {
        await expect(closeReport(reportIdToCreate, 'iLoveNothing')).rejects.toThrow('Password incorrect for this report, please try again');
      });
      it('If it has already been closed, throws an error with a useful message', async () => {
        await client.query(`
          UPDATE reports
          SET "isOpen"='false'
          WHERE id=$1;
        `, [reportIdToClose]);
        await expect(closeReport(reportIdToClose, 'GhostbustersNeeded')).rejects.toThrow('This report has already been closed');
      });
      it('Finally, updates the report if there are no failures, as above', async () => {
        message = await closeReport(reportIdToCreate, 'ShipIsNoMore');
        const {rows} = await client.query(`
        SELECT * FROM reports
        WHERE id=$1;
        `, [reportIdToCreate]);
        [report] = rows;
        expect(report.isOpen).toBe(false);
      });
      it('Returns a message stating that the report has been closed', async () => {
        expect(message).toEqual({message: "Report successfully closed!"});
      });
    })
    describe('createReportComment', () => {
      const commentFields = {content: 'something strange is happening in this galaxy, for sure'}
      const password = 'DontWatchTooLong';
      
      beforeAll(async() => {
        testReportForComments = await createReport({
          title: 'Beckoning Being',
          location: 'Starry Sky',
          description: 'A strange being waving as I watched the comet fly by',
          password
        });
        reportIdForComments = testReportForComments.id;
      })
      it('if it wasnt found, throw an error saying `That report does not exist, no comment has been made`', async () => {
        await expect(createReportComment(500, commentFields)).rejects.toThrow('That report does not exist, no comment has been made');
      });
      console.log(commentFields.content)
      it('if the current date is past the expiration, throw an error saying `The discussion time on this report has expired, no comment has been made`', async () => {
        await client.query(`
          UPDATE reports
          SET "expirationDate" = CURRENT_TIMESTAMP - interval '1 day'
          WHERE id=$1
          RETURNING *;
        `, [reportIdForComments]);
        await expect(createReportComment(reportIdForComments, commentFields)).rejects.toThrow('The discussion time on this report has expired, no comment has been made');
        await client.query(`
          UPDATE reports
          SET "expirationDate" = CURRENT_TIMESTAMP + interval '1 day'
          WHERE id=$1
          RETURNING *;
        `, [reportIdForComments]);
      });
      it('if all is a go, should return the comment', async () => {
        const comment = await createReportComment(reportIdForComments, commentFields);
        expect(comment.content).toBe(commentFields.content);
      });
      it('if it is not open, throw an error saying `That report has been closed, no comment has been made`', async () => {
        await client.query(`
          UPDATE reports
          SET "isOpen"='false'
          WHERE id=$1;
        `, [reportIdForComments]);
        await expect(createReportComment(reportIdForComments, commentFields)).rejects.toThrow('That report has been closed, no comment has been made');
      });
      
    })
  })
});
