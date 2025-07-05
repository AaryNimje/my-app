// backend/src/controllers/workflowController.js
const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const csv = require('csv-parser');

class WorkflowController {
  // Create new workflow with enhanced properties
  async createWorkflow(req, res) {
    try {
      const { 
        name, 
        description, 
        category, 
        tags, 
        canvas_state, 
        properties,
        is_public = false
      } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Workflow name is required'
        });
      }

      // Insert workflow with enhanced properties
      const result = await db.query(
        `INSERT INTO workflows (
          user_id, name, description, category, tags, 
          canvas_state, is_public, properties, global_variables
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          userId, 
          name, 
          description, 
          category, 
          tags || [], 
          canvas_state || {},
          is_public,
          properties || {},
          {} // global_variables
        ]
      );

      // Log workflow creation
      await this.logWorkflowAction(userId, result.rows[0].id, 'created', {
        name,
        category,
        properties: properties || {}
      });

      res.status(201).json({
        success: true,
        workflow: result.rows[0]
      });
    } catch (error) {
      console.error('Create workflow error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get all workflows for user with enhanced filtering
  async getWorkflows(req, res) {
    try {
      const userId = req.user.id;
      const { 
        category, 
        tags, 
        search, 
        limit = 50, 
        offset = 0,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      let query = `
        SELECT w.*, 
               COUNT(we.id) as execution_count,
               MAX(we.created_at) as last_executed
        FROM workflows w
        LEFT JOIN workflow_executions we ON w.id = we.workflow_id
        WHERE w.user_id = $1 AND w.is_active = true
      `;
      const queryParams = [userId];
      let paramCount = 1;

      // Add filters
      if (category) {
        paramCount++;
        query += ` AND w.category = $${paramCount}`;
        queryParams.push(category);
      }

      if (tags && Array.isArray(tags)) {
        paramCount++;
        query += ` AND w.tags && $${paramCount}`;
        queryParams.push(tags);
      }

      if (search) {
        paramCount++;
        query += ` AND (w.name ILIKE $${paramCount} OR w.description ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      query += ` GROUP BY w.id`;
      query += ` ORDER BY w.${sort_by} ${sort_order}`;
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      queryParams.push(limit, offset);

      const result = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT w.id) as total
        FROM workflows w
        WHERE w.user_id = $1 AND w.is_active = true
      `;
      const countParams = [userId];
      let countParamIndex = 1;

      if (category) {
        countParamIndex++;
        countQuery += ` AND w.category = $${countParamIndex}`;
        countParams.push(category);
      }

      if (tags && Array.isArray(tags)) {
        countParamIndex++;
        countQuery += ` AND w.tags && $${countParamIndex}`;
        countParams.push(tags);
      }

      if (search) {
        countParamIndex++;
        countQuery += ` AND (w.name ILIKE $${countParamIndex} OR w.description ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await db.query(countQuery, countParams);

      res.json({
        success: true,
        workflows: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      });
    } catch (error) {
      console.error('Get workflows error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get single workflow with enhanced details
  async getWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `SELECT w.*, 
                COUNT(DISTINCT we.id) as execution_count,
                MAX(we.created_at) as last_executed,
                AVG(we.duration_ms) as avg_duration_ms
         FROM workflows w
         LEFT JOIN workflow_executions we ON w.id = we.workflow_id
         WHERE w.id = $1 AND (w.user_id = $2 OR w.is_public = true)
         GROUP BY w.id`,
        [workflowId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      const workflow = result.rows[0];

      // Get recent executions
      const executionsResult = await db.query(
        `SELECT id, status, created_at, duration_ms, error_message
         FROM workflow_executions
         WHERE workflow_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [workflowId]
      );

      workflow.recent_executions = executionsResult.rows;

      res.json({
        success: true,
        workflow
      });
    } catch (error) {
      console.error('Get workflow error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update workflow with properties support
  async updateWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const { 
        name, 
        description, 
        category, 
        tags, 
        canvas_state, 
        properties,
        is_public,
        global_variables
      } = req.body;
      const userId = req.user.id;

      // Check ownership
      const ownershipCheck = await db.query(
        'SELECT id FROM workflows WHERE id = $1 AND user_id = $2',
        [workflowId, userId]
      );

      if (ownershipCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found or access denied'
        });
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      if (name !== undefined) {
        paramCount++;
        updateFields.push(`name = $${paramCount}`);
        updateValues.push(name);
      }

      if (description !== undefined) {
        paramCount++;
        updateFields.push(`description = $${paramCount}`);
        updateValues.push(description);
      }

      if (category !== undefined) {
        paramCount++;
        updateFields.push(`category = $${paramCount}`);
        updateValues.push(category);
      }

      if (tags !== undefined) {
        paramCount++;
        updateFields.push(`tags = $${paramCount}`);
        updateValues.push(tags);
      }

      if (canvas_state !== undefined) {
        paramCount++;
        updateFields.push(`canvas_state = $${paramCount}`);
        updateValues.push(canvas_state);
      }

      if (properties !== undefined) {
        paramCount++;
        updateFields.push(`properties = $${paramCount}`);
        updateValues.push(properties);
      }

      if (is_public !== undefined) {
        paramCount++;
        updateFields.push(`is_public = $${paramCount}`);
        updateValues.push(is_public);
      }

      if (global_variables !== undefined) {
        paramCount++;
        updateFields.push(`global_variables = $${paramCount}`);
        updateValues.push(global_variables);
      }

      // Always update the updated_at timestamp
      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      updateValues.push(new Date());

      if (updateFields.length === 1) { // Only updated_at
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }

      // Add WHERE clause parameters
      updateValues.push(workflowId, userId);
      const whereClause = `WHERE id = $${paramCount + 1} AND user_id = $${paramCount + 2}`;

      const query = `
        UPDATE workflows 
        SET ${updateFields.join(', ')}
        ${whereClause}
        RETURNING *
      `;

      const result = await db.query(query, updateValues);

      // Log workflow update
      await this.logWorkflowAction(userId, workflowId, 'updated', {
        updated_fields: updateFields.map(field => field.split(' = ')[0]),
        properties: properties || {}
      });

      res.json({
        success: true,
        workflow: result.rows[0]
      });
    } catch (error) {
      console.error('Update workflow error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Enhanced workflow execution with properties-based configuration
  async executeWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const { canvas_state, properties, input_data = {} } = req.body;
      const userId = req.user.id;

      const startTime = Date.now();

      // Get workflow
      const workflowResult = await db.query(
        'SELECT * FROM workflows WHERE id = $1 AND (user_id = $2 OR is_public = true)',
        [workflowId, userId]
      );

      if (workflowResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      const workflow = workflowResult.rows[0];
      const executionProperties = properties || workflow.properties || {};

      // Create execution record
      const executionResult = await db.query(
        `INSERT INTO workflow_executions (
          workflow_id, user_id, status, canvas_state, properties, input_data
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [workflowId, userId, 'running', canvas_state, executionProperties, input_data]
      );

      const executionId = executionResult.rows[0].id;

      try {
        // Execute workflow based on canvas state and properties
        const results = await this.processWorkflowExecution(
          canvas_state || workflow.canvas_state,
          executionProperties,
          input_data,
          executionId
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Update execution record with results
        await db.query(
          `UPDATE workflow_executions 
           SET status = $1, results = $2, duration_ms = $3, completed_at = $4
           WHERE id = $5`,
          ['completed', results, duration, new Date(), executionId]
        );

        // Log successful execution
        await this.logWorkflowAction(userId, workflowId, 'executed', {
          execution_id: executionId,
          duration_ms: duration,
          status: 'completed'
        });

        res.json({
          success: true,
          execution_id: executionId,
          results,
          duration_ms: duration,
          properties: executionProperties
        });

      } catch (executionError) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Update execution record with error
        await db.query(
          `UPDATE workflow_executions 
           SET status = $1, error_message = $2, duration_ms = $3, completed_at = $4
           WHERE id = $5`,
          ['failed', executionError.message, duration, new Date(), executionId]
        );

        // Log failed execution
        await this.logWorkflowAction(userId, workflowId, 'execution_failed', {
          execution_id: executionId,
          duration_ms: duration,
          error: executionError.message
        });

        res.status(500).json({
          success: false,
          error: executionError.message,
          execution_id: executionId
        });
      }

    } catch (error) {
      console.error('Execute workflow error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Process workflow execution based on nodes and properties
  async processWorkflowExecution(canvasState, properties, inputData, executionId) {
    const { nodes = [], edges = [] } = canvasState;
    
    // Build execution graph
    const nodeMap = new Map();
    const nodeResults = new Map();
    
    nodes.forEach(node => {
      nodeMap.set(node.id, {
        ...node,
        inputs: [],
        outputs: []
      });
    });

    // Map connections
    edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (sourceNode && targetNode) {
        sourceNode.outputs.push({
          targetNodeId: edge.target,
          targetHandle: edge.targetHandle
        });
        targetNode.inputs.push({
          sourceNodeId: edge.source,
          sourceHandle: edge.sourceHandle
        });
      }
    });

    // Find starting nodes (nodes with no inputs)
    const startingNodes = nodes.filter(node => {
      const nodeData = nodeMap.get(node.id);
      return nodeData.inputs.length === 0;
    });

    // Execute nodes in topological order
    const executionQueue = [...startingNodes];
    const processedNodes = new Set();
    const results = {};

    while (executionQueue.length > 0) {
      const currentNode = executionQueue.shift();
      
      if (processedNodes.has(currentNode.id)) {
        continue;
      }

      // Check if all input nodes have been processed
      const nodeData = nodeMap.get(currentNode.id);
      const inputsReady = nodeData.inputs.every(input => 
        processedNodes.has(input.sourceNodeId)
      );

      if (!inputsReady) {
        // Put back at end of queue
        executionQueue.push(currentNode);
        continue;
      }

      try {
        // Execute node
        const nodeResult = await this.executeNode(
          currentNode, 
          nodeData, 
          nodeResults, 
          properties, 
          executionId
        );

        nodeResults.set(currentNode.id, nodeResult);
        processedNodes.add(currentNode.id);
        results[currentNode.id] = nodeResult;

        // Add output nodes to queue
        nodeData.outputs.forEach(output => {
          const targetNode = nodes.find(n => n.id === output.targetNodeId);
          if (targetNode && !processedNodes.has(targetNode.id)) {
            executionQueue.push(targetNode);
          }
        });

        // Log node execution
        await db.query(
          `INSERT INTO node_executions (
            workflow_execution_id, node_id, node_type, status, results, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [executionId, currentNode.id, currentNode.type, 'completed', nodeResult, new Date()]
        );

      } catch (nodeError) {
        // Log node failure
        await db.query(
          `INSERT INTO node_executions (
            workflow_execution_id, node_id, node_type, status, error_message, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [executionId, currentNode.id, currentNode.type, 'failed', nodeError.message, new Date()]
        );

        throw new Error(`Node ${currentNode.id} (${currentNode.type}) failed: ${nodeError.message}`);
      }
    }

    // Process final results based on output configuration
    return this.processWorkflowResults(results, properties.output || {});
  }

  // Execute individual node based on type
  async executeNode(node, nodeData, nodeResults, properties, executionId) {
    const inputData = this.collectNodeInputs(nodeData, nodeResults);

    switch (node.type) {
      case 'fileInput':
        return await this.executeFileInputNode(node, inputData);
      
      case 'llm':
        return await this.executeLLMNode(node, inputData, properties.llm || {});
      
      case 'agent':
        return await this.executeAgentNode(node, inputData, properties.agent || {});
      
      case 'tool':
        return await this.executeToolNode(node, inputData);
      
      case 'condition':
        return await this.executeConditionNode(node, inputData);
      
      case 'output':
        return await this.executeOutputNode(node, inputData, properties.output || {});
      
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  // File Input Node execution
  async executeFileInputNode(node, inputData) {
    const { uploadedFiles = [], selectedKnowledgeFiles = [] } = node.data;
    
    const processedFiles = [];

    // Process uploaded files
    for (const file of uploadedFiles) {
      try {
        const extractedContent = await this.extractFileContent(file);
        processedFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          content: extractedContent,
          source: 'upload'
        });
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        processedFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          error: error.message,
          source: 'upload'
        });
      }
    }

    // Process knowledge base files
    for (const knowledgeFile of selectedKnowledgeFiles) {
      try {
        // Get file content from knowledge base
        const fileContent = await this.getKnowledgeFileContent(knowledgeFile.id);
        processedFiles.push({
          ...knowledgeFile,
          content: fileContent,
          source: 'knowledge'
        });
      } catch (error) {
        console.error(`Failed to process knowledge file ${knowledgeFile.name}:`, error);
        processedFiles.push({
          ...knowledgeFile,
          error: error.message,
          source: 'knowledge'
        });
      }
    }

    return {
      files: processedFiles,
      totalFiles: processedFiles.length,
      totalSize: processedFiles.reduce((sum, file) => sum + (file.size || 0), 0)
    };
  }

  // LLM Node execution using centralized properties
  async executeLLMNode(node, inputData, llmProperties) {
    const { 
      provider = 'openai',
      model = 'gpt-4',
      temperature = 0.7,
      maxTokens = 2048,
      systemPrompt = 'You are a helpful assistant.'
    } = llmProperties;

    // Combine input data into a prompt
    let prompt = '';
    if (inputData.files && inputData.files.length > 0) {
      prompt += 'Files provided:\n';
      inputData.files.forEach(file => {
        if (file.content) {
          prompt += `\n--- ${file.name} ---\n${file.content}\n`;
        }
      });
      prompt += '\n';
    }

    if (node.data.prompt) {
      prompt += node.data.prompt;
    }

    // Call LLM service based on provider
    const llmResponse = await this.callLLMService(provider, {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    });

    return {
      response: llmResponse.content,
      usage: llmResponse.usage,
      model: model,
      provider: provider
    };
  }

  // Tool Node execution (now called Prompt Tool)
  async executeToolNode(node, inputData) {
    const { 
      prompt = '',
      outputFormat = 'text',
      formatConfig = {}
    } = node.data;

    // Process the input data according to the prompt
    let processedContent = prompt;

    // Replace placeholders with actual data
    if (inputData.files) {
      const fileContents = inputData.files
        .map(file => file.content)
        .filter(content => content)
        .join('\n\n');
      
      processedContent = processedContent.replace('{{files}}', fileContents);
    }

    // Format output according to specified format
    let formattedOutput;
    switch (outputFormat) {
      case 'json':
        try {
          formattedOutput = JSON.parse(processedContent);
        } catch {
          formattedOutput = { content: processedContent };
        }
        break;
      
      case 'csv':
        formattedOutput = this.convertToCSV(processedContent, formatConfig);
        break;
      
      case 'markdown':
        formattedOutput = this.convertToMarkdown(processedContent);
        break;
      
      default:
        formattedOutput = processedContent;
    }

    return {
      content: formattedOutput,
      format: outputFormat,
      originalPrompt: prompt
    };
  }

  // Output Node execution with multiple destinations
  async executeOutputNode(node, inputData, outputProperties) {
    const {
      destination = 'ui-playground',
      defaultFormat = 'text',
      autoSave = false,
      fileName = 'output'
    } = outputProperties;

    const output = {
      content: inputData,
      format: defaultFormat,
      destination: destination,
      timestamp: new Date()
    };

    // Handle file generation if needed
    if (destination === 'file-download' || autoSave) {
      const fileData = await this.generateOutputFile(inputData, defaultFormat, fileName);
      output.fileData = fileData;
    }

    return output;
  }

  // Helper methods for file processing
  async extractFileContent(file) {
    const filePath = file.path || file.tempPath;
    const fileExtension = path.extname(file.name).toLowerCase();

    switch (fileExtension) {
      case '.pdf':
        return await this.extractPDFContent(filePath);
      
      case '.docx':
        return await this.extractDocxContent(filePath);
      
      case '.xlsx':
      case '.xls':
        return await this.extractExcelContent(filePath);
      
      case '.csv':
        return await this.extractCSVContent(filePath);
      
      case '.txt':
      case '.md':
        return await fs.readFile(filePath, 'utf-8');
      
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  }

  async extractPDFContent(filePath) {
    try {
      const pdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      
      // For now, return basic info - would need a proper PDF text extraction library
      return `PDF document with ${pageCount} pages. Content extraction requires additional setup.`;
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  async extractDocxContent(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
  }

  async extractExcelContent(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      
      let content = '';
      sheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        content += `\n--- Sheet: ${sheetName} ---\n${csvData}\n`;
      });
      
      return content;
    } catch (error) {
      throw new Error(`Excel extraction failed: ${error.message}`);
    }
  }

  async extractCSVContent(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`CSV extraction failed: ${error.message}`);
    }
  }

  // Knowledge base file content retrieval
  async getKnowledgeFileContent(fileId) {
    try {
      const result = await db.query(
        'SELECT content FROM knowledge_documents WHERE id = $1',
        [fileId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Knowledge file not found');
      }
      
      return result.rows[0].content;
    } catch (error) {
      throw new Error(`Failed to retrieve knowledge file: ${error.message}`);
    }
  }

  // LLM service call
  async callLLMService(provider, params) {
    // This would interface with the actual LLM APIs
    // For now, return a mock response
    return {
      content: `Mock response from ${provider} model ${params.model}. Processed prompt with ${params.messages.length} messages.`,
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    };
  }

  // Collect inputs from connected nodes
  collectNodeInputs(nodeData, nodeResults) {
    const inputs = {};
    
    nodeData.inputs.forEach(input => {
      const sourceResult = nodeResults.get(input.sourceNodeId);
      if (sourceResult) {
        inputs[input.sourceHandle || 'default'] = sourceResult;
      }
    });

    return inputs;
  }

  // Process final workflow results
  processWorkflowResults(nodeResults, outputConfig) {
    // Find output nodes
    const outputResults = {};
    
    for (const [nodeId, result] of nodeResults.entries()) {
      if (result && typeof result === 'object') {
        outputResults[nodeId] = result;
      }
    }

    // Apply output formatting based on configuration
    if (outputConfig.defaultFormat) {
      return this.formatResults(outputResults, outputConfig.defaultFormat);
    }

    return outputResults;
  }

  formatResults(results, format) {
    switch (format) {
      case 'json':
        return results;
      
      case 'text':
        return JSON.stringify(results, null, 2);
      
      case 'markdown':
        return this.convertToMarkdown(results);
      
      default:
        return results;
    }
  }

  // Utility methods
  convertToCSV(data, config = {}) {
    if (typeof data === 'string') {
      return data;
    }
    
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => `"${row[header] || ''}"`).join(',')
        )
      ];
      
      return csvRows.join('\n');
    }
    
    return JSON.stringify(data);
  }

  convertToMarkdown(data) {
    if (typeof data === 'string') {
      return data;
    }
    
    return `# Workflow Results\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }

  async generateOutputFile(data, format, fileName) {
    let content;
    let mimeType;
    let extension;

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = '.json';
        break;
      
      case 'csv':
        content = this.convertToCSV(data);
        mimeType = 'text/csv';
        extension = '.csv';
        break;
      
      case 'markdown':
        content = this.convertToMarkdown(data);
        mimeType = 'text/markdown';
        extension = '.md';
        break;
      
      default:
        content = typeof data === 'string' ? data : JSON.stringify(data);
        mimeType = 'text/plain';
        extension = '.txt';
    }

    return {
      content,
      mimeType,
      fileName: fileName + extension
    };
  }

  // Log workflow actions
  async logWorkflowAction(userId, workflowId, action, metadata = {}) {
    try {
      await db.query(
        `INSERT INTO audit_logs (
          user_id, resource_type, resource_id, action, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, 'workflow', workflowId, action, metadata, new Date()]
      );
    } catch (error) {
      console.error('Failed to log workflow action:', error);
    }
  }

  // Delete workflow
  async deleteWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const userId = req.user.id;

      // Check ownership
      const ownershipCheck = await db.query(
        'SELECT id, name FROM workflows WHERE id = $1 AND user_id = $2',
        [workflowId, userId]
      );

      if (ownershipCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found or access denied'
        });
      }

      const workflowName = ownershipCheck.rows[0].name;

      // Soft delete the workflow
      await db.query(
        'UPDATE workflows SET is_active = false, updated_at = $1 WHERE id = $2',
        [new Date(), workflowId]
      );

      // Log deletion
      await this.logWorkflowAction(userId, workflowId, 'deleted', {
        workflow_name: workflowName
      });

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      console.error('Delete workflow error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get workflow executions
  async getExecutions(req, res) {
    try {
      const { workflowId } = req.params;
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      // Check workflow access
      const workflowCheck = await db.query(
        'SELECT id FROM workflows WHERE id = $1 AND (user_id = $2 OR is_public = true)',
        [workflowId, userId]
      );

      if (workflowCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      const result = await db.query(
        `SELECT * FROM workflow_executions 
         WHERE workflow_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [workflowId, limit, offset]
      );

      res.json({
        success: true,
        executions: result.rows
      });
    } catch (error) {
      console.error('Get executions error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get execution details
  async getExecutionDetails(req, res) {
    try {
      const { executionId } = req.params;
      const userId = req.user.id;

      const result = await db.query(
        `SELECT we.*, w.name as workflow_name
         FROM workflow_executions we
         JOIN workflows w ON we.workflow_id = w.id
         WHERE we.id = $1 AND (w.user_id = $2 OR w.is_public = true)`,
        [executionId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found'
        });
      }

      // Get node execution details
      const nodeExecutions = await db.query(
        `SELECT * FROM node_executions 
         WHERE workflow_execution_id = $1 
         ORDER BY created_at ASC`,
        [executionId]
      );

      const execution = result.rows[0];
      execution.node_executions = nodeExecutions.rows;

      res.json({
        success: true,
        execution
      });
    } catch (error) {
      console.error('Get execution details error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new WorkflowController();