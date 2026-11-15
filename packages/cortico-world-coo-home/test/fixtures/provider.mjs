// A generated local provider for isolated official-Core integration only.
// It uses the host's standard Responses protocol and never opens a network.
import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createResponse } from 'cortico/protocol/open-responses/index.ts';

const cursors = new Map();
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(signal.reason || Error('Cancelled fixture response'));
  const finish = () => { signal?.removeEventListener('abort', abort); resolve(); };
  const timer = setTimeout(finish, ms);
  function abort() { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(signal.reason || Error('Cancelled fixture response')); }
  signal?.addEventListener('abort', abort, { once: true });
});

export default {
  id: 'coo-home-fixture', title: 'Neutral local integration fixture',
  reasoningTiers: [], serviceTiers: [],
  describe: { protocols: ['openai-responses'], auth: ['api-key'], local: true, input: ['text'] },
  create(name, entry, host) {
    const audit = value => appendFile(join(host.stateDir, 'audit.jsonl'), JSON.stringify(value) + '\n');
    return {
      handlesRefusedImages: true,
      client: {
        async respond(request, options = {}) {
          const oauth = entry.options?.fixtureAuth === 'oauth'
            ? JSON.parse(await readFile(join(host.stateDir, 'session.json'), 'utf8')) : null;
          const plan = JSON.parse(await readFile(join(host.stateDir, 'control.json'), 'utf8'));
          const matches = !plan.match || JSON.stringify(request.input).includes(plan.match);
          const cursorKey = `${host.stateDir}:${plan.id}`, index = matches ? cursors.get(cursorKey) || 0 : -1;
          if (matches) cursors.set(cursorKey, index + 1);
          const step = (matches && plan.steps[index]) || { text: 'Neutral fixture turn finished.' };
          const requestId = `${plan.id}:${index}`;
          await audit({ kind: 'request', requestId, plan: plan.id, index, name, model: request.model, nativeSpec: options.nativeSpec,
            sessionId: options.sessionId, input: request.input, instructions: request.instructions, tools: request.tools,
            secretMatched: !entry.secret || host.secret(entry.secret) === 'synthetic-test-only',
            oauthMatched: !oauth || oauth.accessToken === 'synthetic-oauth-test-only' });
          try {
            await sleep(step.delayMs || 15, options.signal);
            let sequence = 0;
            const emit = value => options.onEvent?.({ ...structuredClone(value), sequence_number: sequence++ });
            const response = createResponse(`fixture-${requestId}`, request);
            emit({ type: 'response.created', response });
            const outputs = [];
            if (step.text) {
              const item = { type: 'message', id: `message-${requestId}`, role: 'assistant', status: 'in_progress', content: [] };
              emit({ type: 'response.output_item.added', output_index: outputs.length, item });
              emit({ type: 'response.content_part.added', item_id: item.id, output_index: outputs.length, content_index: 0, part: { type: 'output_text', text: '', annotations: [] } });
              const split = Math.max(1, Math.floor(step.text.length / 2));
              for (const delta of [step.text.slice(0, split), step.text.slice(split)]) {
                if (delta) emit({ type: 'response.output_text.delta', item_id: item.id, output_index: outputs.length, content_index: 0, delta });
                await sleep(step.chunkMs || 20, options.signal);
              }
              const part = { type: 'output_text', text: step.text, annotations: [] };
              item.content.push(part); item.status = 'completed';
              emit({ type: 'response.output_text.done', item_id: item.id, output_index: outputs.length, content_index: 0, text: step.text });
              emit({ type: 'response.content_part.done', item_id: item.id, output_index: outputs.length, content_index: 0, part });
              emit({ type: 'response.output_item.done', output_index: outputs.length, item });
              outputs.push(item);
            }
            for (const [ordinal, call] of (step.calls || []).entries()) {
              const item = { type: 'function_call', id: `call-${requestId}-${ordinal}`, call_id: call.id || `call-${plan.id}-${ordinal}`, name: call.name || 'coo_home', arguments: '', status: 'in_progress' };
              emit({ type: 'response.output_item.added', output_index: outputs.length, item });
              item.arguments = typeof call.args === 'string' ? call.args : JSON.stringify(call.args);
              emit({ type: 'response.function_call_arguments.delta', item_id: item.id, output_index: outputs.length, delta: item.arguments });
              emit({ type: 'response.function_call_arguments.done', item_id: item.id, output_index: outputs.length, arguments: item.arguments });
              item.status = 'completed';
              emit({ type: 'response.output_item.done', output_index: outputs.length, item });
              outputs.push(item);
            }
            response.output = outputs; response.status = 'completed'; response.completed_at = Math.floor(Date.now() / 1000);
            response.usage = { input_tokens: 24, output_tokens: 12, total_tokens: 36, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } };
            emit({ type: 'response.completed', response });
            await audit({ kind: 'completed', requestId });
            const origin = options.origin || { instance: name, module: 'coo-home-fixture', model: request.model || '', compatibilityDomain: 'neutral-fixture' };
            return { response, origin, attempts: [{ id: `attempt-${requestId}`, generationId: response.id, ordinal: 0, origin,
              startedAt: new Date().toISOString(), elapsedMs: 0, requestId, responseId: response.id, outcome: 'completed', status: 200,
              serviceTier: null, meters: { input: 24, output: 12, total: 36, cachedInput: 0, uncachedInput: 24, reasoning: 0, native: null }, charges: [] }] };
          } catch (error) {
            await audit({ kind: options.signal?.aborted ? 'cancelled' : 'error', requestId });
            throw error;
          }
        },
      },
    };
  },
};
