import { Injectable, Inject, Logger } from '@nestjs/common'
import { GqlOptionsFactory, GqlModuleOptions } from '@nestjs/graphql'
import { MemcachedCache } from 'apollo-server-cache-memcached'
import { PubSub } from 'graphql-subscriptions'
// import { join } from 'path'
import {
	ApolloError,
	GraphQLExtension,
	AuthenticationError
} from 'apollo-server-core'
import { Logger as winstonLogger } from 'winston'
import { MockList } from 'graphql-tools'
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json'
import schemaDirectives from './directives'
import { AuthService } from '../../auth/auth.service'
import { ConfigService } from './../envConfig/config.service'
// import { NODE_ENV, FE_URL, END_POINT } from '../../environments'

const pubSub = new PubSub()
class MyErrorTrackingExtension extends GraphQLExtension {
	willSendResponse(o) {
		const { context, graphqlResponse } = o

		context.trackErrors(graphqlResponse.errors)

		return o
	}
	// Other lifecycle methods include
	// requestDidStart
	// parsingDidStart
	// validationDidStart
	// executionDidStart
	// willSendResponse
}

// COMPLETE:
@Injectable()
export class GraphqlService implements GqlOptionsFactory {
	constructor(
		@Inject('winston') private readonly logger: winstonLogger,
		private readonly authService: AuthService,
		private readonly configServcie: ConfigService
	) {}

	async createGqlOptions(): Promise<GqlModuleOptions> {
		return {
			typePaths: ['./**/*.graphql'],
			resolvers: { JSON: GraphQLJSON, JSONObject: GraphQLJSONObject },
			extensions: [() => new MyErrorTrackingExtension()],
			mocks: this.configServcie.get('NODE_ENV') === 'testing' && {
				// String: () => 'Chnirt',
				Query: () => ({
					users: () => new MockList([2, 6])
				})
			},
			resolverValidationOptions: {
				requireResolversForResolveType: false
			},
			path: `/${this.configServcie.get('END_POINT')}`,
			cors:
				this.configServcie.get('NODE_ENV') === 'production'
					? {
							origin: this.configServcie.get('FE_URL'),
							credentials: true // <-- REQUIRED backend setting
					  }
					: true,
			bodyParserConfig: { limit: '50mb' },
			onHealthCheck: () => {
				return new Promise((resolve, reject) => {
					// Replace the `true` in this conditional with more specific checks!
					if (true) {
						resolve()
					} else {
						reject()
					}
				})
			},
			// definitions: {
			// 	path: join(process.cwd(), 'src/graphql.ts'),
			// 	outputAs: 'class'
			// },
			schemaDirectives,
			introspection: true,
			playground: this.configServcie.get('NODE_ENV') !== 'production' && {
				settings: {
					'editor.cursorShape': 'block', // possible values: 'line', 'block', 'underline'
					'editor.fontFamily': `'Source Code Pro', 'Consolas', 'Inconsolata', 'Droid Sans Mono', 'Monaco', monospace`,
					'editor.fontSize': 14,
					'editor.reuseHeaders': true, // new tab reuses headers from last tab
					'editor.theme': 'dark', // possible values: 'dark', 'light'
					'general.betaUpdates': true,
					'queryPlan.hideQueryPlanResponse': false,
					'request.credentials': 'include', // possible values: 'omit', 'include', 'same-origin'
					'tracing.hideTracingResponse': false
				}
				// tabs: [
				// 	{
				// 		endpoint: END_POINT,
				// 		query: '{ hello }'
				// 	}
				// ]
			},
			tracing: this.configServcie.get('NODE_ENV') === 'production' && true,
			cacheControl: this.configServcie.get('NODE_ENV') === 'production' && {
				defaultMaxAge: 5,
				stripFormattedExtensions: false,
				calculateHttpHeaders: false
			},
			context: async ({ req, res, connection }) => {
				if (connection) {
					return {
						req: connection.context,
						pubSub
					}
				}

				let currentUser

				const { token } = req.headers || ''

				if (token) {
					currentUser = await this.authService.verifyToken(token)
				}

				return {
					req,
					res,
					pubSub,
					currentUser,
					trackErrors(errors) {
						// Track the errors
						// console.log(errors)
					}
				}
			},
			formatError: error => {
				// this.logger.error('✖️ ' + JSON.stringify(err.message), 'Error')
				if (error.originalError instanceof AuthenticationError) {
					return new Error('Different authentication error message!')
				}

				return error
			},
			formatResponse: response => {
				// console.log(response)
				return response
			},
			subscriptions: {
				path: `/${this.configServcie.get('END_POINT')}`,
				keepAlive: 1000,
				onConnect: async (connectionParams, webSocket, context) => {
					this.configServcie.get('NODE_ENV') !== 'production' &&
						Logger.log(`🔗  Connected to websocket`, 'GraphQL')

					let currentUser

					const token = connectionParams['token']

					if (token) {
						currentUser = await this.authService.verifyToken(token)

						return { currentUser }
					}

					throw new ApolloError('currentUser Required', '499', {})
				},
				onDisconnect: (webSocket, context) => {
					this.configServcie.get('NODE_ENV') !== 'production' &&
						Logger.log(`❌  Disconnected to websocket`, 'GraphQL')
				}
			},
			persistedQueries: {
				cache: new MemcachedCache(
					['memcached-server-1', 'memcached-server-2', 'memcached-server-3'],
					{ retries: 10, retry: 10000 } // Options
				)
			},
			installSubscriptionHandlers: true,
			uploads: false
		}
	}
}
