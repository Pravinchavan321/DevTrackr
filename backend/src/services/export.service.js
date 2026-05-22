import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Repository from '../models/Repository.model.js';
import Commit from '../models/Commit.model.js';
import PullRequest from '../models/PullRequest.model.js';
import Issue from '../models/Issue.model.js';
import AIInsight from '../models/AIInsight.model.js';

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Verifies repository ownership and validates the repository ID format.
 * @param {string} repoId
 * @param {string} userId
 * @returns {Promise<object>} The repository document
 */
export const verifyRepositoryAccess = async (repoId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(repoId)) {
    throw new AppError('Invalid repository ID format', 400);
  }

  const repo = await Repository.findById(repoId).lean();
  if (!repo) {
    throw new AppError('Repository not found', 404);
  }

  if (repo.userId.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to access this repository', 403);
  }

  return repo;
};

const formatDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toISOString().split('T')[0];
};

/**
 * Loads all data required for the repository report.
 */
export const getReportData = async (repoId, userId) => {
  const repo = await verifyRepositoryAccess(repoId, userId);
  const repoObjectId = new mongoose.Types.ObjectId(repoId);

  // 1. Gather stats
  const totalCommits = await Commit.countDocuments({ repoId: repoObjectId });
  const totalPRs = await PullRequest.countDocuments({ repoId: repoObjectId });
  const mergedPRs = await PullRequest.countDocuments({ repoId: repoObjectId, merged: true });
  const openPRs = await PullRequest.countDocuments({ repoId: repoObjectId, state: 'open' });
  const closedPRs = await PullRequest.countDocuments({ repoId: repoObjectId, state: 'closed', merged: false });
  const openIssues = await Issue.countDocuments({ repoId: repoObjectId, state: 'open' });
  const closedIssues = await Issue.countDocuments({ repoId: repoObjectId, state: 'closed' });

  const prStats = await PullRequest.aggregate([
    { $match: { repoId: repoObjectId, merged: true } },
    {
      $project: {
        durationHours: {
          $divide: [
            { $subtract: ['$mergedAt', '$githubCreatedAt'] },
            1000 * 60 * 60
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$durationHours' }
      }
    }
  ]);
  const avgMergeTimeHours = prStats.length > 0 ? Math.round(prStats[0].avgDuration * 100) / 100 : 0;

  // 2. Contributors stats
  const contributorsPipeline = [
    { $match: { repoId: repoObjectId } },
    {
      $project: {
        identity: {
          $cond: {
            if: { $and: [{ $ne: ['$author.login', ''] }, { $ne: ['$author.login', null] }] },
            then: '$author.login',
            else: {
              $cond: {
                if: { $and: [{ $ne: ['$author.email', ''] }, { $ne: ['$author.email', null] }] },
                then: '$author.email',
                else: { $ifNull: ['$author.name', 'Unknown'] }
              }
            }
          }
        },
        author: 1,
        additions: { $ifNull: ['$additions', 0] },
        deletions: { $ifNull: ['$deletions', 0] },
        filesChanged: { $ifNull: ['$filesChanged', 0] },
        committedAt: 1
      }
    },
    {
      $group: {
        _id: '$identity',
        login: { $first: '$author.login' },
        name: { $first: '$author.name' },
        avatarUrl: { $first: '$author.avatarUrl' },
        email: { $first: '$author.email' },
        totalCommits: { $sum: 1 },
        additions: { $sum: '$additions' },
        deletions: { $sum: '$deletions' },
        filesChanged: { $sum: '$filesChanged' },
        lastCommitAt: { $max: '$committedAt' }
      }
    },
    {
      $project: {
        _id: 0,
        login: {
          $cond: {
            if: { $and: [{ $ne: ['$login', ''] }, { $ne: ['$login', null] }] },
            then: '$login',
            else: {
              $cond: {
                if: { $and: [{ $ne: ['$email', ''] }, { $ne: ['$email', null] }] },
                then: '$email',
                else: { $ifNull: ['$name', 'Unknown'] }
              }
            }
          }
        },
        name: {
          $cond: {
            if: { $and: [{ $ne: ['$name', ''] }, { $ne: ['$name', null] }] },
            then: '$name',
            else: {
              $cond: {
                if: { $and: [{ $ne: ['$login', ''] }, { $ne: ['$login', null] }] },
                then: '$login',
                else: { $ifNull: ['$email', 'Unknown'] }
              }
            }
          }
        },
        avatarUrl: { $ifNull: ['$avatarUrl', ''] },
        totalCommits: 1,
        additions: 1,
        deletions: 1,
        filesChanged: 1,
        lastCommitAt: 1
      }
    },
    { $sort: { totalCommits: -1 } }
  ];
  const contributors = await Commit.aggregate(contributorsPipeline);
  const totalContributors = contributors.length;

  // 3. Recent commits (max 10)
  const recentCommits = await Commit.find({ repoId: repoObjectId })
    .sort({ committedAt: -1 })
    .limit(10)
    .lean();

  // 4. Recent PRs (max 10)
  const recentPRs = await PullRequest.find({ repoId: repoObjectId })
    .sort({ githubCreatedAt: -1 })
    .limit(10)
    .lean();

  // 5. Recent issues (max 10)
  const recentIssues = await Issue.find({ repoId: repoObjectId })
    .sort({ githubCreatedAt: -1 })
    .limit(10)
    .lean();

  // 6. Cached AI insights
  const insights = await AIInsight.find({ repoId: repoObjectId }).lean();
  const sprintSummary = insights.find(i => i.type === 'sprint_summary');
  const bottleneck = insights.find(i => i.type === 'bottleneck');
  const recommendations = insights.find(i => i.type === 'recommendations');

  return {
    repo,
    stats: {
      totalCommits,
      totalPRs,
      mergedPRs,
      openPRs,
      closedPRs,
      openIssues,
      closedIssues,
      totalContributors,
      avgMergeTimeHours
    },
    contributors,
    recentCommits,
    recentPRs,
    recentIssues,
    insights: {
      sprintSummary,
      bottleneck,
      recommendations
    }
  };
};

/**
 * Generates the PDF report using PDFKit and pipes it to a writable stream.
 */
export const generateRepositoryPdfReport = async (repoId, userId, writableStream) => {
  const data = await getReportData(repoId, userId);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true
  });

  doc.pipe(writableStream);

  // 1. Cover Page
  // Draw primary background header
  doc.rect(0, 0, 595.28, 260).fill('#312e81');

  // Title on cover page
  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(28)
     .text('DevTrackr', 50, 80)
     .fontSize(20)
     .text('Repository Productivity Report', 50, 120);

  // Repository Full Name
  doc.fillColor('#e0e7ff')
     .font('Helvetica-Bold')
     .fontSize(14)
     .text(data.repo.fullName, 50, 180);

  // Generated date
  doc.font('Helvetica-Oblique')
     .fontSize(10)
     .text(`Generated on: ${new Date().toUTCString()}`, 50, 210);

  // Repo details card background
  doc.rect(50, 290, 495, 140).fill('#f8fafc');

  // Rect border
  doc.strokeColor('#e2e8f0')
     .lineWidth(1)
     .rect(50, 290, 495, 140)
     .stroke();

  doc.fillColor('#1f2937')
     .font('Helvetica-Bold')
     .fontSize(12)
     .text('Repository Information', 65, 305);

  doc.font('Helvetica')
     .fontSize(10)
     .fillColor('#4b5563')
     .text('Description:', 65, 330)
     .text('Primary Language:', 65, 350)
     .text('Stars:', 65, 370)
     .text('Forks:', 65, 390)
     .text('Open Issues:', 300, 370)
     .text('Default Branch:', 300, 390);

  doc.fillColor('#1f2937')
     .text(data.repo.description || 'No description provided.', 150, 330, { width: 380, height: 15, ellipsis: true })
     .text(data.repo.language || 'Not specified', 170, 350)
     .text(data.repo.stars?.toString() || '0', 100, 370)
     .text(data.repo.forks?.toString() || '0', 100, 390)
     .text(data.repo.openIssuesCount?.toString() || '0', 380, 370)
     .text(data.repo.defaultBranch || 'main', 380, 390);

  // Footer on cover page
  doc.fillColor('#9ca3af')
     .font('Helvetica')
     .fontSize(9)
     .text('DevTrackr AI-Powered Developer Productivity Insights', 50, 750, { align: 'center', width: 495 });

  // Add Page break for content
  doc.addPage();

  // Section layout helper
  const checkPageOverflow = (neededHeight) => {
    if (doc.y + neededHeight > 730) {
      doc.addPage();
    }
  };

  const drawSectionHeader = (title) => {
    checkPageOverflow(50);
    doc.rect(50, doc.y, 5, 20).fill('#4f46e5');
    doc.fillColor('#1f2937')
       .font('Helvetica-Bold')
       .fontSize(14)
       .text(title, 65, doc.y + 3);
    doc.moveDown(1.2);
  };

  // 2. Stats Summary
  drawSectionHeader('Statistics Summary');

  const statsStartY = doc.y;
  doc.rect(50, statsStartY, 495, 120).fill('#f8fafc');
  doc.strokeColor('#e2e8f0').lineWidth(1).rect(50, statsStartY, 495, 120).stroke();

  doc.fillColor('#4b5563')
     .font('Helvetica-Bold')
     .fontSize(10)
     // Col 1
     .text('Total Commits:', 70, statsStartY + 15)
     .text('Total Pull Requests:', 70, statsStartY + 35)
     .text('Merged Pull Requests:', 70, statsStartY + 55)
     .text('Open Pull Requests:', 70, statsStartY + 75)
     .text('Closed Pull Requests:', 70, statsStartY + 95)
     // Col 2
     .text('Open Issues:', 300, statsStartY + 15)
     .text('Closed Issues:', 300, statsStartY + 35)
     .text('Total Contributors:', 300, statsStartY + 55)
     .text('Avg PR Merge Time:', 300, statsStartY + 75);

  doc.fillColor('#1f2937')
     .font('Helvetica')
     .text(data.stats.totalCommits.toString(), 200, statsStartY + 15)
     .text(data.stats.totalPRs.toString(), 200, statsStartY + 35)
     .text(data.stats.mergedPRs.toString(), 200, statsStartY + 55)
     .text(data.stats.openPRs.toString(), 200, statsStartY + 75)
     .text(data.stats.closedPRs.toString(), 200, statsStartY + 95)
     .text(data.stats.openIssues.toString(), 420, statsStartY + 15)
     .text(data.stats.closedIssues.toString(), 420, statsStartY + 35)
     .text(data.stats.totalContributors.toString(), 420, statsStartY + 55)
     .text(`${data.stats.avgMergeTimeHours} hours`, 420, statsStartY + 75);

  doc.y = statsStartY + 120;
  doc.moveDown(1.5);

  // 3. Top Contributors Table
  drawSectionHeader('Top Contributors');
  if (data.contributors.length === 0) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10).text('No contributor data available.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    checkPageOverflow(60);
    let tableY = doc.y;

    // Draw Header
    doc.rect(50, tableY, 495, 20).fill('#e0e7ff');
    doc.fillColor('#312e81').font('Helvetica-Bold').fontSize(9);
    doc.text('Contributor', 55, tableY + 5, { width: 140, ellipsis: true });
    doc.text('Commits', 205, tableY + 5, { width: 55, align: 'right' });
    doc.text('Additions', 265, tableY + 5, { width: 75, align: 'right' });
    doc.text('Deletions', 345, tableY + 5, { width: 75, align: 'right' });
    doc.text('Last Commit', 425, tableY + 5, { width: 115, align: 'right' });

    tableY += 20;

    const topContributors = data.contributors.slice(0, 10);
    for (let index = 0; index < topContributors.length; index++) {
      const c = topContributors[index];
      const beforeY = doc.y;
      checkPageOverflow(25);
      if (doc.y < beforeY) {
        tableY = doc.y;
      }

      if (index % 2 === 1) {
        doc.rect(50, tableY, 495, 20).fill('#f8fafc');
      }

      doc.fillColor('#1f2937').font('Helvetica').fontSize(9);
      doc.text(c.login || c.name || 'Unknown', 55, tableY + 5, { width: 140, ellipsis: true });
      doc.text(c.totalCommits.toString(), 205, tableY + 5, { width: 55, align: 'right' });
      doc.text(`+${c.additions}`, 265, tableY + 5, { width: 75, align: 'right' });
      doc.text(`-${c.deletions}`, 345, tableY + 5, { width: 75, align: 'right' });
      doc.text(formatDate(c.lastCommitAt), 425, tableY + 5, { width: 115, align: 'right' });

      tableY += 20;
      doc.y = tableY;
    }
    doc.moveDown(1.5);
  }

  // 4. Commit Activity Summary
  drawSectionHeader('Recent Commit Activity (Max 10)');
  if (data.recentCommits.length === 0) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10).text('No commit activity available.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    checkPageOverflow(60);
    let tableY = doc.y;

    // Draw Header
    doc.rect(50, tableY, 495, 20).fill('#f1f5f9');
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9);
    doc.text('Commit Message', 55, tableY + 5, { width: 220, ellipsis: true });
    doc.text('Author', 280, tableY + 5, { width: 80, ellipsis: true });
    doc.text('Changes', 365, tableY + 5, { width: 70, align: 'right' });
    doc.text('Committed Date', 440, tableY + 5, { width: 100, align: 'right' });

    tableY += 20;

    for (let index = 0; index < data.recentCommits.length; index++) {
      const commit = data.recentCommits[index];
      const beforeY = doc.y;
      checkPageOverflow(25);
      if (doc.y < beforeY) {
        tableY = doc.y;
      }

      if (index % 2 === 1) {
        doc.rect(50, tableY, 495, 20).fill('#f8fafc');
      }

      const msgClean = (commit.message || '').split('\n')[0].substring(0, 45);

      doc.fillColor('#1f2937').font('Helvetica').fontSize(9);
      doc.text(msgClean, 55, tableY + 5, { width: 220, ellipsis: true });
      doc.text(commit.author?.login || commit.author?.name || 'Unknown', 280, tableY + 5, { width: 80, ellipsis: true });
      doc.text(`+${commit.additions || 0}/-${commit.deletions || 0}`, 365, tableY + 5, { width: 70, align: 'right' });
      doc.text(formatDate(commit.committedAt), 440, tableY + 5, { width: 100, align: 'right' });

      tableY += 20;
      doc.y = tableY;
    }
    doc.moveDown(1.5);
  }

  // 5. Pull Request Summary
  drawSectionHeader('Recent Pull Requests (Max 10)');
  if (data.recentPRs.length === 0) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10).text('No pull requests available.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    checkPageOverflow(60);
    let tableY = doc.y;

    // Draw Header
    doc.rect(50, tableY, 495, 20).fill('#f1f5f9');
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9);
    doc.text('PR #', 55, tableY + 5, { width: 35 });
    doc.text('Title', 95, tableY + 5, { width: 200, ellipsis: true });
    doc.text('State', 300, tableY + 5, { width: 60 });
    doc.text('Created', 365, tableY + 5, { width: 85, align: 'right' });
    doc.text('Merged', 455, tableY + 5, { width: 85, align: 'right' });

    tableY += 20;

    for (let index = 0; index < data.recentPRs.length; index++) {
      const pr = data.recentPRs[index];
      const beforeY = doc.y;
      checkPageOverflow(25);
      if (doc.y < beforeY) {
        tableY = doc.y;
      }

      if (index % 2 === 1) {
        doc.rect(50, tableY, 495, 20).fill('#f8fafc');
      }

      const titleClean = (pr.title || '').substring(0, 42);
      let stateLabel = pr.state || 'closed';
      if (pr.merged) {
        stateLabel = 'merged';
      }

      doc.fillColor('#1f2937').font('Helvetica').fontSize(9);
      doc.text(`#${pr.number}`, 55, tableY + 5, { width: 35 });
      doc.text(titleClean, 95, tableY + 5, { width: 200, ellipsis: true });
      doc.text(stateLabel.toUpperCase(), 300, tableY + 5, { width: 60 });
      doc.text(formatDate(pr.githubCreatedAt), 365, tableY + 5, { width: 85, align: 'right' });
      doc.text(formatDate(pr.mergedAt), 455, tableY + 5, { width: 85, align: 'right' });

      tableY += 20;
      doc.y = tableY;
    }
    doc.moveDown(1.5);
  }

  // 6. Issue Summary
  drawSectionHeader('Recent Issues (Max 10)');
  if (data.recentIssues.length === 0) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10).text('No issues available.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    checkPageOverflow(60);
    let tableY = doc.y;

    // Draw Header
    doc.rect(50, tableY, 495, 20).fill('#f1f5f9');
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9);
    doc.text('Issue #', 55, tableY + 5, { width: 45 });
    doc.text('Title', 105, tableY + 5, { width: 240, ellipsis: true });
    doc.text('State', 350, tableY + 5, { width: 50 });
    doc.text('Created', 405, tableY + 5, { width: 65, align: 'right' });
    doc.text('Closed', 475, tableY + 5, { width: 65, align: 'right' });

    tableY += 20;

    for (let index = 0; index < data.recentIssues.length; index++) {
      const issue = data.recentIssues[index];
      const beforeY = doc.y;
      checkPageOverflow(25);
      if (doc.y < beforeY) {
        tableY = doc.y;
      }

      if (index % 2 === 1) {
        doc.rect(50, tableY, 495, 20).fill('#f8fafc');
      }

      const titleClean = (issue.title || '').substring(0, 50);

      doc.fillColor('#1f2937').font('Helvetica').fontSize(9);
      doc.text(`#${issue.number}`, 55, tableY + 5, { width: 45 });
      doc.text(titleClean, 105, tableY + 5, { width: 240, ellipsis: true });
      doc.text((issue.state || 'open').toUpperCase(), 350, tableY + 5, { width: 50 });
      doc.text(formatDate(issue.githubCreatedAt), 405, tableY + 5, { width: 65, align: 'right' });
      doc.text(formatDate(issue.closedAt), 475, tableY + 5, { width: 65, align: 'right' });

      tableY += 20;
      doc.y = tableY;
    }
    doc.moveDown(1.5);
  }

  // 7. AI Sprint Summary
  drawSectionHeader('AI Sprint Summary');
  const sprintSummaryInsight = data.insights.sprintSummary;
  if (!sprintSummaryInsight || !sprintSummaryInsight.parsedData) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(9).text('AI Insight not cached. Please run generation in the app dashboard to include this section in the report.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    const { summary, velocity, highlights, concerns, sprintScore } = sprintSummaryInsight.parsedData;

    checkPageOverflow(60);
    const boxY = doc.y;
    doc.rect(50, boxY, 495, 45).fill('#eff6ff');
    doc.strokeColor('#bfdbfe').lineWidth(1).rect(50, boxY, 495, 45).stroke();

    doc.fillColor('#1e40af')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(`Sprint Score: ${sprintScore || 'N/A'}/10`, 65, boxY + 15)
       .text(`Velocity: ${(velocity || '').toUpperCase()}`, 300, boxY + 15);

    doc.y = boxY + 45;
    doc.moveDown(1);

    checkPageOverflow(80);
    doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(10).text('Executive Summary', 50, doc.y);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9.5).fillColor('#374151').text(summary || 'No summary details provided.', 50, doc.y, { width: 495, lineGap: 2 });
    doc.moveDown(1);

    if (highlights && highlights.length > 0) {
      checkPageOverflow(50);
      doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(10).text('Key Highlights', 50, doc.y);
      doc.moveDown(0.4);
      highlights.forEach(h => {
        checkPageOverflow(15);
        doc.font('Helvetica').fontSize(9).fillColor('#374151').text(`• ${h}`, 60, doc.y);
      });
      doc.moveDown(1);
    }

    if (concerns && concerns.length > 0) {
      checkPageOverflow(50);
      doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(10).text('Areas of Concern', 50, doc.y);
      doc.moveDown(0.4);
      concerns.forEach(c => {
        checkPageOverflow(15);
        doc.font('Helvetica').fontSize(9).fillColor('#374151').text(`• ${c}`, 60, doc.y);
      });
      doc.moveDown(1.5);
    }
  }

  // 8. AI Bottlenecks
  drawSectionHeader('AI Bottlenecks Detection');
  const bottleneckInsight = data.insights.bottleneck;
  if (!bottleneckInsight || !bottleneckInsight.parsedData) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(9).text('AI Insight not cached. Please run generation in the app dashboard to include this section in the report.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    const { bottlenecks, riskLevel, topRecommendation } = bottleneckInsight.parsedData;

    checkPageOverflow(45);
    const boxY = doc.y;
    doc.rect(50, boxY, 495, 40).fill(riskLevel === 'high' ? '#fef2f2' : riskLevel === 'medium' ? '#fffbeb' : '#f0fdf4');
    doc.strokeColor(riskLevel === 'high' ? '#fecaca' : riskLevel === 'medium' ? '#fef3c7' : '#bbf7d0').lineWidth(1).rect(50, boxY, 495, 40).stroke();

    doc.fillColor(riskLevel === 'high' ? '#991b1b' : riskLevel === 'medium' ? '#92400e' : '#166534')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(`Overall Risk Level: ${(riskLevel || 'low').toUpperCase()}`, 65, boxY + 15);

    doc.y = boxY + 40;
    doc.moveDown(1);

    if (topRecommendation) {
      checkPageOverflow(50);
      doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(10).text('Top Recommendation', 50, doc.y);
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9.5).fillColor('#374151').text(topRecommendation, 50, doc.y, { width: 495, lineGap: 2 });
      doc.moveDown(1);
    }

    if (bottlenecks && bottlenecks.length > 0) {
      checkPageOverflow(80);
      doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(10).text('Detected Bottlenecks', 50, doc.y);
      doc.moveDown(0.5);

      let tableY = doc.y;
      doc.rect(50, tableY, 495, 20).fill('#f8fafc');
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8.5);
      doc.text('Type', 55, tableY + 5, { width: 100 });
      doc.text('Severity', 160, tableY + 5, { width: 50 });
      doc.text('Description', 215, tableY + 5, { width: 140 });
      doc.text('Suggestion', 360, tableY + 5, { width: 180 });

      tableY += 20;
      doc.y = tableY;

      bottlenecks.forEach((b, index) => {
        const beforeY = doc.y;
        checkPageOverflow(40);
        if (doc.y < beforeY) {
          tableY = doc.y;
        }
        if (index % 2 === 1) {
          doc.rect(50, tableY, 495, 30).fill('#fafafa');
        }

        doc.fillColor('#1f2937').font('Helvetica').fontSize(8.5);
        doc.text(b.type || 'N/A', 55, tableY + 5, { width: 100, ellipsis: true });

        const sev = (b.severity || 'low').toLowerCase();
        doc.fillColor(sev === 'high' ? '#ef4444' : sev === 'medium' ? '#f59e0b' : '#10b981')
           .font('Helvetica-Bold')
           .text(sev.toUpperCase(), 160, tableY + 5, { width: 50 });

        doc.fillColor('#374151')
           .font('Helvetica')
           .text(b.description || 'N/A', 215, tableY + 5, { width: 140, height: 22, ellipsis: true })
           .text(b.suggestion || 'N/A', 360, tableY + 5, { width: 180, height: 22, ellipsis: true });

        tableY += 30;
        doc.y = tableY;
      });
      doc.moveDown(1.5);
    }
  }

  // 9. AI Recommendations
  drawSectionHeader('AI Sprint Recommendations');
  const recommendationsInsight = data.insights.recommendations;
  if (!recommendationsInsight || !recommendationsInsight.parsedData) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(9).text('AI Insight not cached. Please run generation in the app dashboard to include this section in the report.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    const { recommendations: recsList, nextBestAction } = recommendationsInsight.parsedData;

    if (nextBestAction) {
      checkPageOverflow(45);
      const boxY = doc.y;
      doc.rect(50, boxY, 495, 40).fill('#f0fdf4');
      doc.strokeColor('#bbf7d0').lineWidth(1).rect(50, boxY, 495, 40).stroke();

      doc.fillColor('#166534')
         .font('Helvetica-Bold')
         .fontSize(9.5)
         .text(`Next Best Action: ${nextBestAction}`, 65, boxY + 15, { width: 460 });

      doc.y = boxY + 40;
      doc.moveDown(1);
    }

    if (recsList && recsList.length > 0) {
      checkPageOverflow(50);
      doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(10).text('Prioritized Recommendations', 50, doc.y);
      doc.moveDown(0.5);

      let tableY = doc.y;
      doc.rect(50, tableY, 495, 20).fill('#f8fafc');
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8.5);
      doc.text('Priority', 55, tableY + 5, { width: 50 });
      doc.text('Recommendation', 110, tableY + 5, { width: 130 });
      doc.text('Reason', 245, tableY + 5, { width: 120 });
      doc.text('Immediate Action', 370, tableY + 5, { width: 170 });

      tableY += 20;
      doc.y = tableY;

      recsList.forEach((r, index) => {
        const beforeY = doc.y;
        checkPageOverflow(45);
        if (doc.y < beforeY) {
          tableY = doc.y;
        }
        if (index % 2 === 1) {
          doc.rect(50, tableY, 495, 40).fill('#fafafa');
        }

        const prio = (r.priority || 'low').toLowerCase();
        doc.fillColor(prio === 'high' ? '#ef4444' : prio === 'medium' ? '#f59e0b' : '#10b981')
           .font('Helvetica-Bold')
           .fontSize(8.5)
           .text(prio.toUpperCase(), 55, tableY + 5, { width: 50 });

        doc.fillColor('#1f2937')
           .font('Helvetica-Bold')
           .text(r.title || 'N/A', 110, tableY + 5, { width: 130, height: 30, ellipsis: true });

        doc.fillColor('#374151')
           .font('Helvetica')
           .text(r.reason || 'N/A', 245, tableY + 5, { width: 120, height: 30, ellipsis: true })
           .text(r.action || 'N/A', 370, tableY + 5, { width: 170, height: 30, ellipsis: true });

        tableY += 40;
        doc.y = tableY;
      });
    }
  }

  // 10. Footer and page numbers
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);

    // Skip cover page footer
    if (i > 0) {
      doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(50, 780).lineTo(545, 780).stroke();

      doc.fillColor('#6b7280')
         .font('Helvetica')
         .fontSize(8);

      doc.text('Generated by DevTrackr', 50, 788);
      doc.text(`Page ${i + 1} of ${range.count}`, 50, 788, { align: 'right', width: 495 });
    }
  }

  doc.end();
};
