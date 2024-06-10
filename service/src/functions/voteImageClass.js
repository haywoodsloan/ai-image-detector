import { app } from '@azure/functions';

app.http('voteImageClass', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(request);
    }
});
