// GET /briefing?teamId&module   (module optional)
// returns: { claims: [...], decisions: [...] }

// TODO: validate teamId
// TODO: find active claims (expiresAt > now) for the team
// TODO: aggregate last 10 decisions for team (+ module if given), sorted by createdAt desc
//       keep the pipeline short and readable, it goes on screen in the demo
// TODO: return { claims, decisions }
