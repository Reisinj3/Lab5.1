pipeline {
    agent any 

    environment {
        DOCKER_CREDENTIALS_ID = 'roseaw-dockerhub'
        DOCKER_IMAGE          = 'cithit/reisinj3'              // your DockerHub image
        IMAGE_TAG             = "build-${BUILD_NUMBER}"
        GITHUB_URL            = 'https://github.com/Reisinj3/225-lab4-2.git'
        KUBECONFIG            = credentials('reisinj3-225')    // your kube creds
    }

    stages {
        stage('Code Checkout') {
            steps {
                cleanWs()
                checkout([$class: 'GitSCM',
                          branches: [[name: '*/main']],
                          userRemoteConfigs: [[url: "${GITHUB_URL}"]]])
            }
        }

        stage('Static Code Testing (Python)') {
            steps {
                sh 'pip install flake8'
                // Run flake8 on your key Python files
                sh 'flake8 main.py data-gen.py data-clear.py'
            }
        }
        
        stage('Lint HTML') {
            steps {
                sh 'npm install htmlhint --save-dev'
                sh 'npx htmlhint *.html'
            }
        }
        
        stage('Build & Push Docker Image') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', "${DOCKER_CREDENTIALS_ID}") {
                        def app = docker.build("${DOCKER_IMAGE}:${IMAGE_TAG}", "-f Dockerfile.build .")
                        app.push()
                    }
                }
            }
        }

        stage('Deploy to Dev Environment') {
            steps {
                script {
                    // read kubeconfig (even if not explicitly used, keeps pattern from lab)
                    def kubeConfig = readFile(KUBECONFIG)
                    // clear old deployments
                    sh "kubectl delete --all deployments --namespace=default || true"
                    // update dev deployment yaml to use new image tag
                    sh "sed -i 's|${DOCKER_IMAGE}:latest|${DOCKER_IMAGE}:${IMAGE_TAG}|' deployment-dev.yaml"
                    sh "kubectl apply -f deployment-dev.yaml"
                }
            }
        }
        
        stage('Run Security Checks') {
            steps {
                sh 'docker pull public.ecr.aws/portswigger/dastardly:latest'
                sh '''
                    docker run --user $(id -u) -v ${WORKSPACE}:${WORKSPACE}:rw \
                    -e HOME=${WORKSPACE} \
                    -e BURP_START_URL=http://10.48.229.141 \
                    -e BURP_REPORT_FILE_PATH=${WORKSPACE}/dastardly-report.xml \
                    public.ecr.aws/portswigger/dastardly:latest
                '''
            }
        }
        
        stage('Reset DB After Security Checks') {
            steps {
                script {
                    // grab a running app pod
                    def appPod = sh(
                        script: "kubectl get pods -l app=flask -o jsonpath='{.items[0].metadata.name}'",
                        returnStdout: true
                    ).trim()
        
                    sh """
                        kubectl exec ${appPod} -- python3 - <<'PY'
                        import sqlite3
                        conn = sqlite3.connect('/nfs/demo.db')
                        cur = conn.cursor()
                        cur.execute('DELETE FROM contacts')
                        conn.commit()
                        conn.close()
                        PY
                    """
                }
            }
        } 
   
        stage('Generate Test Data') {
            steps {
                script {
                    // Ensure the label accurately targets the correct pods.
                    def appPod = sh(
                        script: "kubectl get pods -l app=flask -o jsonpath='{.items[0].metadata.name}'",
                        returnStdout: true
                    ).trim()

                    sh "sleep 15"
                    sh "kubectl get pods"
                    sh "kubectl exec ${appPod} -- python3 data-gen.py"
                }
            }
        }

        stage('Run Acceptance Tests') {
            steps {
                script {
                    sh 'docker stop qa-tests || true'
                    sh 'docker rm qa-tests || true'
                    sh 'docker build -t qa-tests -f Dockerfile.test .'
                    sh 'docker run qa-tests'
                }
            }
        }
        
        stage('Remove Test Data') {
            steps {
                script {
                    def appPod = sh(
                        script: "kubectl get pods -l app=flask -o jsonpath='{.items[0].metadata.name}'",
                        returnStdout: true
                    ).trim()
                    sh "kubectl exec ${appPod} -- python3 data-clear.py"
                }
            }
        }

        stage('Deploy to Prod Environment') {
            steps {
                script {
                    // update prod deployment yaml to use new image tag
                    sh "sed -i 's|${DOCKER_IMAGE}:latest|${DOCKER_IMAGE}:${IMAGE_TAG}|' deployment-prod.yaml"
                    sh "cd .."
                    sh "kubectl apply -f deployment-prod.yaml"
                }
            }
        }

        stage('Check Kubernetes Cluster') {
            steps {
                script {
                    sh "kubectl get all"
                }
            }
        }
    }

    post {
        success {
            slackSend color: "good", message: "Build Completed: ${env.JOB_NAME} ${env.BUILD_NUMBER}"
        }
        unstable {
            slackSend color: "warning", message: "Build Completed (UNSTABLE): ${env.JOB_NAME} ${env.BUILD_NUMBER}"
        }
        failure {
            slackSend color: "danger", message: "Build FAILED: ${env.JOB_NAME} ${env.BUILD_NUMBER}"
        }
    }
}
