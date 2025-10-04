#!/usr/bin/env node

// Knowledge Base Builder
// Reads markdown files from /kb/ and generates /data/kb.json

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const KB_DIR = path.join(__dirname, '..', 'kb');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'kb.json');

function walkDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirectory(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function buildKnowledgeBase() {
  console.log('🔨 Building knowledge base...\n');
  
  // Check if kb directory exists
  if (!fs.existsSync(KB_DIR)) {
    console.error(`❌ Error: ${KB_DIR} directory not found`);
    console.log('   Create it first: mkdir -p kb/services kb/pricing');
    process.exit(1);
  }
  
  // Get all markdown files
  const mdFiles = walkDirectory(KB_DIR);
  
  if (mdFiles.length === 0) {
    console.error('❌ Error: No markdown files found in /kb/');
    console.log('   Add some .md files first');
    process.exit(1);
  }
  
  console.log(`📄 Found ${mdFiles.length} markdown files\n`);
  
  const documents = [];
  
  mdFiles.forEach(filePath => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data: frontmatter, content } = matter(fileContent);
      
      // Extract filename without extension for ID
      const relativePath = path.relative(KB_DIR, filePath);
      const id = relativePath.replace(/\.md$/, '').replace(/\//g, '-');
      
      const doc = {
        id,
        title: frontmatter.title || path.basename(filePath, '.md'),
        tags: frontmatter.tags || [],
        keywords: frontmatter.keywords || [],
        category: frontmatter.category || 'general',
        time_band_weeks: frontmatter.time_band_weeks || null,
        price_band_usd: frontmatter.price_band_usd || null,
        body_md: content.trim()
      };
      
      documents.push(doc);
      console.log(`✓ ${relativePath}`);
      
    } catch (error) {
      console.error(`✗ Failed to process ${filePath}:`, error.message);
    }
  });
  
  // Create output directory if it doesn't exist
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write JSON file
  const kb = {
    generated_at: new Date().toISOString(),
    version: '1.0',
    document_count: documents.length,
    documents
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(kb, null, 2));
  
  console.log(`\n✅ Knowledge base built successfully!`);
  console.log(`   Output: ${OUTPUT_FILE}`);
  console.log(`   Documents: ${documents.length}`);
  console.log(`   Size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB\n`);
}

// Run the builder
try {
  buildKnowledgeBase();
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
