import express from "express";
import expressGraphql from "express-graphql";
import graphql from "graphql";
import cors from "cors";

import models from "./gqlModels";
import { queries, mutations, root } from "./queries";
import { getUser } from "./utils";

const { buildSchema } = graphql;
const { graphqlHTTP } = expressGraphql;
const app = express();

app.use(cors());
const schema = buildSchema(`
  ${models}
  type Query {
    ${queries}
  }
  type Mutation {
    ${mutations}
  }
`);

app.use(
  "/graphql",
  graphqlHTTP(async (req) => {
    const token = req.headers.authorization || "";
    // try to retrieve a user with the token
    const user = await getUser(token);
    // add the user to the context
    return {
      schema: schema,
      rootValue: root,
      graphiql: {
        headerEditorEnabled: true,
      },
      context: { user },
    };
  })
);

const PORT = process.env.PORT || 4000;

app.listen(PORT, function () {
  console.log(
    "==> Listening on port %s. Visit http://localhost:%s/graphql in your browser.",
    PORT,
    PORT
  );
});
