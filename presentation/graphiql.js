import * as React from 'react'
// import * as GraphiQL from 'graphiql'
import { CustomGraphiQL } from 'graphcool-graphiql'
import * as cx from 'classnames'
import * as frontmatter from 'front-matter'
import '../styles/graphiql-light.css'

function parseDSL(literal) {
  const fm = frontmatter(literal)

  const [queryPart, a, b] = fm.body.split('---')

  let dataPart
  let variablesPart = null

  if (b) {
    dataPart = b
    variablesPart = a
  } else {
    dataPart = a
  }

  return {
    data: dataPart.trim(),
    disabled: fm.attributes.disabled || false,
    endpoint: fm.attributes.endpoint,
    query: queryPart.trim(),
    variables: variablesPart ? variablesPart.trim() : null,
  }
}

export function dslValid(literal) {
  const fm = frontmatter(literal)

  if (fm.body.split('---').length < 2) {
    return false
  }

  if (!fm.attributes.disabled && !fm.attributes.endpoint) {
    return false
  }

  return true
}

export function getVariables(literal) {
  const fm = frontmatter(literal)
  const components = fm.body.split('---')
  return components[1]
}

export function getGraphQLCode(literal) {
  const fm = frontmatter(literal)
  const components = fm.body.split('---')
  return components[0]
}

export default class MarkdownGraphiQL extends React.Component {
  constructor(props) {
    super(props)

    this.state = this.getDSL(props.literal)
  }

  getDSL(literal) {
    const dsl = parseDSL(literal)
    return {
      query: dsl.query,
      response: dsl.data,
      variables: dsl.variables || '',
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.literal !== this.props.literal) {
      this.setState(this.getDSL(nextProps.literal))
    }
  }

  render() {
    const dsl = parseDSL(this.props.literal)

    const graphQLFetcher = (graphQLParams) => {
      if (dsl.disabled && !graphQLParams.query.includes('IntrospectionQuery')) {
        return JSON.parse(dsl.data)
      }

      if (typeof this.props.onExecuteQuery === 'function') {
        this.props.onExecuteQuery()
      }

      if (!graphQLParams.query.includes('IntrospectionQuery')) {
        this.setState(
          {
            query: graphQLParams.query,
            variables: JSON.stringify(graphQLParams.variables),
          },
        )
      }

      return fetch(dsl.endpoint, {
        body: JSON.stringify(graphQLParams),
        headers: { 'Content-Type': 'application/json' },
        method: 'post',
      }).then(res => res.json())
    }

    const { playground, showSchema, schemaModelName, schemaIdl } = this.props

    return (
      <div
        className={cx('container', {
          disabled: dsl.disabled,
          'graphiql-light': !playground,
          playground,
        })}
      >
        <style jsx={true}>{`
          .container {
            @p: .flex, .flexColumn;
            flex: 1 1 auto;
          }
          .container :global(.graphiql-container) {
            flex: 1 1 auto;
          }
        `}</style>
        <CustomGraphiQL
          showEndpoints={false}
          onChangeEndpoint={this.props.onChangeEndpoint}
          fetcher={graphQLFetcher}
          query={this.state.query}
          variables={this.state.variables}
          onEditQuery={this.handleEditQuery}
          showQueryTitle={true}
          showResponseTitle={true}
          showSchema={showSchema}
          schemaIdl={schemaIdl}
          schemaModelName={schemaModelName}
          disableAutofocus={true}
          schema={this.props.schema}
          disableResize={this.props.disableResize}
          rerenderQuery={true}
          disableQueryHeader={this.props.disableQueryHeader}
        />
      </div>
    )
  }
  handleEditQuery = (query) => this.setState({ query })
}