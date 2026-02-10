/**
 * Admin endpoint for force password change
 * POST /api/admin/force-password-change
 * Runs the force-password-change-all script
 */

const express = require('express');
const router = express.Router();
const { forcePasswordChangeForAll } = require('../scripts/force-password-change-all');
const logger = require('../logger');

router.post('/force-password-change', async (req, res) => {
    try {
        logger.info('admin_force_password_change_requested', {
            transactionId: req.transactionId
        });

        // Run the script
        const result = await forcePasswordChangeForAll();

        res.json({
            success: true,
            message: 'Force password change completed successfully',
            count: result.count || 0,
            users: result.users || []
        });

    } catch (error) {
        logger.error('admin_force_password_change_error', {
            message: error.message,
            transactionId: req.transactionId
        });
        res.status(500).json({
            success: false,
            message: 'Failed to force password change: ' + error.message
        });
    }
});

module.exports = router;
