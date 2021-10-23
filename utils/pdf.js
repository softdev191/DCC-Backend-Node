import ejs from 'ejs';
import pdf from 'html-pdf';
import path from 'path';

export const generateNotePdf = ({
  templateName,
  session
}) => {
  return new Promise((resolve, reject) => {
    ejs.renderFile(path.join(path.resolve(), './views/pdf/', templateName + '.ejs'), { session }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        const options = {
          height: "11.25in",
          width: "8.5in",
          header: {
            height: "20mm"
          },
          footer: {
            height: "20mm",
          },
        };
        pdf.create(data, options).toBuffer(function (err, data) {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      }
    });
  });
}
