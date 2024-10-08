
## Project Setup

- Install `Serverless` globally

```
npm i -g serverless
```

- Install dependencies

```
npm i
```

## Project deployment

Run this command to deploy entire project. Only run when made infrastructure level change e.g modified serverless.yml file

```
serverless deploy
```

## Function Deploy

Run this command to deploy individual functions.

```
serverless deploy function -f functionName
```

## View Server Logs

Run this command to view the server logs for the function

```
serverless logs -f myFuncName -t
```

## Project Structure

All microservices are segregated into individual modules

### Module Structure

```
-- Module_name
  -- handler.js
  -- package.json
  -- src
    -- controllers
    -- db
    -- middlewares
    -- routes
    -- utils
```
