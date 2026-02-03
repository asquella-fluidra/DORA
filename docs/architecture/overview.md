flowchart LR
  subgraph Sources[External Sources]
    JIRA[Jira API]
    GITLAB[GitLab API]
    GITHUB[GitHub API]
    SONAR[SonarQube API]
    GA[Google Analytics API]
  end

  subgraph Ingestion[Ingestion Layer - AWS Lambda (TypeScript)]
    L1[lambda-ingest-jira]
    L2[lambda-ingest-gitlab]
    L3[lambda-ingest-github]
    L4[lambda-ingest-sonarqube]
    L5[lambda-ingest-ga]
  end

  subgraph Raw[S3 RAW Zone]
    S3RAW[(S3 Raw Bucket)]
  end

  subgraph Transform[Transformation Layer - AWS Glue (Python / PySpark)]
    G1[glue-curate-entities]
  end

  subgraph Curated[S3 CURATED Zone]
    S3CUR[(S3 Curated Bucket)]
  end

  subgraph Analytics[Analytics Layer - AWS Glue (Python / PySpark)]
    G2[glue-build-kpis]
  end

  subgraph AnalyticZone[S3 ANALYTICS Zone]
    S3AN[(S3 Analytics Bucket)]
  end

  subgraph Observability[Observability]
    CW[CloudWatch Logs & Metrics]
    DLQ[(SQS DLQ)]
    EB[EventBridge Schedule]
  end

  EB --> L1
  EB --> L2
  EB --> L3
  EB --> L4
  EB --> L5

  JIRA --> L1 --> S3RAW
  GITLAB --> L2 --> S3RAW
  GITHUB --> L3 --> S3RAW
  SONAR --> L4 --> S3RAW
  GA --> L5 --> S3RAW

  S3RAW --> G1 --> S3CUR
  S3CUR --> G2 --> S3AN

  L1 --> CW
  L2 --> CW
  L3 --> CW
  L4 --> CW
  L5 --> CW
  L1 -.fail.-> DLQ
  L2 -.fail.-> DLQ
  L3 -.fail.-> DLQ
  L4 -.fail.-> DLQ
  L5 -.fail.-> DLQ
  G1 --> CW
  G2 --> CW