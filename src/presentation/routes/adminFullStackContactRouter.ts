import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { FullStackContactModel } from "../../infrastructure/database/fullStackContact/fullStackContactModel";
import { authMiddleware } from "../middleware/authMiddleware";

export const adminFullStackContactRouter = Router();

adminFullStackContactRouter.use(authMiddleware);

// GET / - List contacts with filters, search, pagination, and stats
adminFullStackContactRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 8;
    const search = (req.query.search as string || "").trim();
    const status = req.query.status as string;
    const service = req.query.service as string;
    const state = req.query.state as string;
    const assignedTo = req.query.assignedTo as string;
    const scheduledDate = req.query.scheduledDate as string;

    const isStaff = req.user?.role === "staff";
    const currentUserId = req.user?.userId;

    const query: any = {};

    if (isStaff) {
      if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
        query.assignedTo = new mongoose.Types.ObjectId(currentUserId);
      } else {
        query.assignedTo = { $exists: true, $ne: null, $in: [] };
      }
    } else {
      if (assignedTo === "unassigned") {
        query.assignedTo = { $in: [null, undefined] };
      } else if (assignedTo && assignedTo !== "all") {
        if (mongoose.Types.ObjectId.isValid(assignedTo)) {
          query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
        }
      }
    }

    if (scheduledDate === "any") {
      query.scheduledDate = { $exists: true, $ne: null };
    } else if (scheduledDate) {
      const start = new Date(scheduledDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(scheduledDate);
      end.setUTCHours(23, 59, 59, 999);
      query.scheduledDate = { $gte: start, $lte: end };
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const orConditions: any[] = [
        { name: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { companyName: { $regex: escaped, $options: "i" } },
        { service: { $regex: escaped, $options: "i" } },
        { state: { $regex: escaped, $options: "i" } },
        { website: { $regex: escaped, $options: "i" } },
        { comment: { $regex: escaped, $options: "i" } },
      ];
      query.$or = orConditions;
    }

    const listQuery: any = { ...query };
    if (status && status !== "all") {
      listQuery.status = status;
    }
    if (service && service !== "all") {
      listQuery.service = service;
    }
    if (state && state !== "all") {
      listQuery.state = state;
    }

    const skip = (page - 1) * limit;

    const [contacts, filteredTotal, total, pendingCount, contactedCount, needFollowUpCount, convertedCount, rawServices, rawStates] = await Promise.all([
      FullStackContactModel.find(listQuery)
        .populate("assignedTo", "fullName username role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FullStackContactModel.countDocuments(listQuery),
      FullStackContactModel.countDocuments(query),
      FullStackContactModel.countDocuments({ ...query, status: "Pending" }),
      FullStackContactModel.countDocuments({ ...query, status: "Contacted" }),
      FullStackContactModel.countDocuments({ ...query, status: "Need Follow Up" }),
      FullStackContactModel.countDocuments({ ...query, status: { $in: ["Converted", "Completed"] } }),
      FullStackContactModel.distinct("service"),
      FullStackContactModel.distinct("state", { state: { $exists: true, $nin: ["", null] } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        contacts,
        total: filteredTotal,
        page,
        totalPages: Math.ceil(filteredTotal / limit) || 1,
        services: rawServices.filter(Boolean),
        states: rawStates.filter(Boolean),
        stats: {
          total,
          pending: pendingCount,
          contacted: contactedCount,
          needFollowUp: needFollowUpCount,
          converted: convertedCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST / - Create a contact manually
adminFullStackContactRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      phone,
      email,
      companyName,
      service,
      state,
      city,
      budget,
      projectDescription,
      website,
      status = "Pending",
      comment = "",
      scheduledDate,
      assignedTo,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Contact name is required" });
      return;
    }
    if (!phone || !phone.trim()) {
      res.status(400).json({ success: false, message: "Phone number is required" });
      return;
    }

    const creatorName = (req.user as any)?.username || (req.user as any)?.fullName || "Admin";

    const initialActivity: any[] = [
      {
        type: "status",
        from: "",
        to: status,
        at: new Date(),
        by: creatorName,
      },
    ];

    if (comment && comment.trim()) {
      initialActivity.push({
        type: "comment",
        from: "",
        to: comment.trim(),
        at: new Date(),
        by: creatorName,
      });
    }

    const contact = new FullStackContactModel({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : "",
      companyName: companyName ? companyName.trim() : "",
      service: service || "Web Development",
      state: state ? state.trim() : "",
      city: city ? city.trim() : "",
      budget: budget ? budget.trim() : "",
      projectDescription: projectDescription ? projectDescription.trim() : "",
      website: website ? website.trim() : "",
      status,
      comment: comment ? comment.trim() : "",
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      assignedTo: assignedTo && mongoose.Types.ObjectId.isValid(assignedTo) ? new mongoose.Types.ObjectId(assignedTo) : null,
      activityLog: initialActivity,
    });

    await contact.save();
    const populated = await contact.populate("assignedTo", "fullName username role");

    res.status(201).json({
      success: true,
      message: "Contact created successfully",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /:id - Edit contact details
adminFullStackContactRouter.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid contact ID" });
      return;
    }

    const contact = await FullStackContactModel.findById(id);
    if (!contact) {
      res.status(404).json({ success: false, message: "Contact not found" });
      return;
    }

    const {
      name,
      phone,
      email,
      companyName,
      service,
      state,
      city,
      budget,
      projectDescription,
      status,
      assignedTo,
    } = req.body;

    if (name) contact.name = name.trim();
    if (phone) contact.phone = phone.trim();
    if (email !== undefined) contact.email = email.trim();
    if (companyName !== undefined) contact.companyName = companyName.trim();
    if (service) contact.service = service;
    if (state !== undefined) contact.state = state.trim();
    if (city !== undefined) contact.city = city.trim();
    if (budget !== undefined) contact.budget = budget.trim();
    if (projectDescription !== undefined) contact.projectDescription = projectDescription.trim();
    if (status && status !== contact.status) {
      contact.activityLog.push({
        type: "status",
        from: contact.status,
        to: status,
        at: new Date(),
        by: (req.user as any)?.username || "Admin",
      });
      contact.status = status;
    }
    if (assignedTo !== undefined) {
      contact.assignedTo = assignedTo && mongoose.Types.ObjectId.isValid(assignedTo) ? new mongoose.Types.ObjectId(assignedTo) : null;
    }

    await contact.save();
    const updated = await contact.populate("assignedTo", "fullName username role");

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/telecall - Update telecalling status & scheduled follow-up
adminFullStackContactRouter.patch("/:id/telecall", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, comment, scheduledDate, scheduledAt, website, websiteAudit } = req.body;

    const contact = await FullStackContactModel.findById(id);
    if (!contact) {
      res.status(404).json({ success: false, message: "Contact not found" });
      return;
    }

    const actor = (req.user as any)?.username || (req.user as any)?.fullName || "Admin";

    if (typeof website === "string" && website.trim() !== (contact.website || "")) {
      contact.website = website.trim();
    }

    if (websiteAudit) {
      contact.websiteAudit = {
        overallHealth: websiteAudit.overallHealth || "Needs Improvement",
        issues: Array.isArray(websiteAudit.issues) ? websiteAudit.issues : [],
        report: String(websiteAudit.report || "").trim(),
        actionItems: String(websiteAudit.actionItems || "").trim(),
        auditedBy: actor,
        auditedAt: new Date(),
      };
      contact.activityLog.push({
        type: "comment",
        from: "",
        to: "Website audit report updated",
        at: new Date(),
        by: actor,
      });
    }

    if (status && status !== contact.status) {
      contact.activityLog.push({
        type: "status",
        from: contact.status,
        to: status,
        at: new Date(),
        by: actor,
      });
      contact.status = status;
    }

    if (comment && comment.trim() && comment.trim() !== (contact.comment || "").trim()) {
      contact.activityLog.push({
        type: "comment",
        from: contact.comment || "",
        to: comment.trim(),
        at: new Date(),
        by: actor,
      });
      contact.comment = comment.trim();
    }

    const currentSchedule = contact.scheduledDate ? contact.scheduledDate.toISOString().split("T")[0] : "";
    if (scheduledDate && new Date(scheduledDate).toISOString().split("T")[0] !== currentSchedule) {
      const newDate = new Date(scheduledDate);
      contact.activityLog.push({
        type: "schedule",
        from: contact.scheduledDate ? contact.scheduledDate.toISOString().split("T")[0] : "None",
        to: newDate.toISOString().split("T")[0],
        at: new Date(),
        by: actor,
      });
      contact.scheduledDate = newDate;
    }

    if (scheduledAt) {
      contact.scheduledAt = new Date(scheduledAt);
    }

    await contact.save();
    const populated = await contact.populate("assignedTo", "fullName username role");

    res.status(200).json({
      success: true,
      message: "Telecall status updated",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/assign - Assign contact to a staff member
adminFullStackContactRouter.patch("/:id/assign", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    const contact = await FullStackContactModel.findById(id);
    if (!contact) {
      res.status(404).json({ success: false, message: "Contact not found" });
      return;
    }

    const previousStaff = contact.assignedTo ? String(contact.assignedTo) : "Unassigned";
    contact.assignedTo = staffId && mongoose.Types.ObjectId.isValid(staffId) ? new mongoose.Types.ObjectId(staffId) : null;

    contact.activityLog.push({
      type: "assignment",
      from: previousStaff,
      to: staffId ? String(staffId) : "Unassigned",
      at: new Date(),
      by: (req.user as any)?.username || "Admin",
    });

    await contact.save();
    const populated = await contact.populate("assignedTo", "fullName username role");

    res.status(200).json({
      success: true,
      message: "Staff assigned successfully",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - Delete a contact
adminFullStackContactRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await FullStackContactModel.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Contact deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// POST /parse-leads - Convert pasted Google Maps results into structured leads using OpenAI
adminFullStackContactRouter.post("/parse-leads", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawText = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!rawText) {
      res.status(400).json({ success: false, message: "Pasted text is required" });
      return;
    }
    if (rawText.length > 200000) {
      res.status(400).json({ success: false, message: "Pasted text is too large" });
      return;
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, message: "OPENAI_API_KEY is not configured" });
      return;
    }

    // Shrink the input: keep website URLs, drop the very long Google Maps links
    const cleaned = rawText
      .replace(/\[Website\]\((https?:\/\/[^)\s]+)\)/gi, "Website: $1")
      .replace(/\[([^\]]+)\]\(https?:\/\/(?:www\.)?google\.[^)]*\)/gi, "$1");

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You extract business leads from text copied from Google Maps search results. Return JSON: {"leads":[{"name":string,"phone":string,"rating":string,"reviews":string,"category":string,"address":string,"website":string}]}. One entry per business, in the original order. Use "" for any missing field. Phone must be digits/spaces only exactly as shown (no hours text). Ignore review quotes, "Directions", "Open/Closed" hours, and service badges like "On-site services" or "Online estimates". Do not invent data.',
          },
          { role: "user", content: cleaned },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenAI parse-leads error:", errText);
      res.status(502).json({ success: false, message: "AI parsing failed. Please try again." });
      return;
    }

    const aiJson: any = await aiRes.json();
    let leads: any[] = [];
    try {
      leads = JSON.parse(aiJson?.choices?.[0]?.message?.content || "{}").leads || [];
    } catch {
      res.status(502).json({ success: false, message: "AI returned an invalid response" });
      return;
    }

    const normalized = leads
      .filter((l) => l && typeof l.name === "string" && l.name.trim())
      .map((l) => ({
        name: String(l.name).trim(),
        phone: String(l.phone || "").trim(),
        rating: String(l.rating || "").trim(),
        reviews: String(l.reviews || "").replace(/[()]/g, "").trim(),
        category: String(l.category || "").trim(),
        address: String(l.address || "").trim(),
        website: String(l.website || "").trim(),
      }));

    res.status(200).json({ success: true, data: normalized });
  } catch (error) {
    next(error);
  }
});

// POST /format-audit-report - Transform raw copy-pasted website notes into a structured sales audit report using AI
adminFullStackContactRouter.post("/format-audit-report", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawContent = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    const website = typeof req.body?.website === "string" ? req.body.website.trim() : "";
    const companyName = typeof req.body?.companyName === "string" ? req.body.companyName.trim() : "";

    if (!rawContent) {
      res.status(400).json({ success: false, message: "Please paste your website observations or notes first" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, message: "OPENAI_API_KEY is not configured" });
      return;
    }

    const userPrompt = `Client Company: ${companyName || "N/A"}\nWebsite URL: ${website || "N/A"}\n\nRaw Website Audit Notes & Observations:\n${rawContent}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are a senior web development & sales consultant for "Full Stack Solutions" (a modern software development and web design agency). The user will paste raw, unorganized notes, copied website text, performance findings, or rough observations from analyzing a client\'s website. Transform this raw text into a professional, structured website audit and telecaller pitch report.\n\nReturn JSON: {"formattedReport": string, "suggestedPitch": string}.\n\nRules for "formattedReport":\n- DO NOT use any markdown header hashes (\'#\', \'##\', \'###\', \'####\'). Never output any \'#\' characters.\n- DO NOT include an introductory heading or title line like "Website Audit Report for ...". Start directly with the first section.\n- Format section headers cleanly without hashes, using plain text with emojis:\n🔍 Key Website Issues & Technical Flaws\n- [bullet points of issues]\n\n📉 Negative Impact on Business\n- [bullet points of business impacts]\n\n🚀 Recommended Solutions by Full Stack Solutions\n- [bullet points of solutions]\n\n💡 Key Opportunities\n- [bullet points of opportunities]\n\nRules for "suggestedPitch":\nA concise 1-sentence sales pitch / closing hook tailored to this specific client that the telecaller can say over the phone.',
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenAI format-audit-report error:", errText);
      res.status(502).json({ success: false, message: "AI formatting failed. Please try again." });
      return;
    }

    const aiJson: any = await aiRes.json();
    let result = { formattedReport: "", suggestedPitch: "" };
    try {
      result = JSON.parse(aiJson?.choices?.[0]?.message?.content || "{}");
    } catch {
      res.status(502).json({ success: false, message: "AI returned an invalid response" });
      return;
    }

    // Sanitize formattedReport: remove any markdown hashes (#, ##, ###) and title line
    let formattedReport = String(result.formattedReport || rawContent)
      .replace(/^#*\s*Website Audit Report.*$/gim, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    res.status(200).json({
      success: true,
      data: {
        formattedReport,
        suggestedPitch: String(result.suggestedPitch || "").replace(/^#{1,6}\s*/gm, "").trim(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /summarize-comment - Summarize telesales call notes or WhatsApp chat with a business client (B2B Full Stack Solutions)
adminFullStackContactRouter.post("/summarize-comment", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawContent = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    const companyName = typeof req.body?.companyName === "string" ? req.body.companyName.trim() : "";
    const website = typeof req.body?.website === "string" ? req.body.website.trim() : "";

    if (!rawContent) {
      res.status(400).json({ success: false, message: "Content is required for summarization" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, message: "OPENAI_API_KEY is not configured" });
      return;
    }

    const systemPrompt =
      'You are an expert telesales AI assistant for "Full Stack Solutions" (a modern software development and web design agency). The telesales executive contacts business clients (companies, NOT job candidates). The executive will paste rough notes, call remarks, or a WhatsApp chat with a client company.\n\nSummarize the conversation into a concise, professional telesales note (1 to 3 short sentences or clean bullet points).\nHighlight:\n• Client company website/digital presence status (e.g. has no website, outdated website, wants redesign)\n• Services/business requirements discussed (e.g. web development, mobile app, CRM, SEO, eCommerce)\n• Client interest level, budget, or feedback (e.g. asked for quotation, pricing discussed, requested callback)\n• Agreed next steps / follow-up action\n\nStrict Rules:\n- This is a B2B sales client, NEVER treat them as a candidate, job seeker, or applicant.\n- Never use markdown heading hashes (\'#\', \'##\', \'###\').\n- Output ONLY the summary text directly without any prefix, quotes, or conversational fluff.';

    const userPrompt = `Client / Company: ${companyName || "N/A"}\nWebsite: ${website || "N/A"}\n\nCall Notes / Chat:\n${rawContent}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenAI FSS summarize-comment error:", errText);
      res.status(502).json({ success: false, message: "AI summarization failed. Please try again." });
      return;
    }

    const aiJson: any = await aiRes.json();
    let summary = String(aiJson?.choices?.[0]?.message?.content || "").trim();
    summary = summary.replace(/^#{1,6}\s*/gm, "").trim();

    res.status(200).json({
      success: true,
      data: { summary: summary || rawContent },
    });
  } catch (error) {
    next(error);
  }
});

// POST /bulk - Create many contacts at once (skips rows without phone and existing phone numbers)
adminFullStackContactRouter.post("/bulk", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items: any[] = Array.isArray(req.body?.contacts) ? req.body.contacts : [];
    if (!items.length) {
      res.status(400).json({ success: false, message: "No contacts provided" });
      return;
    }

    const digits = (p: string) => String(p || "").replace(/\D/g, "");
    const seen = new Set<string>();
    const valid: any[] = [];
    let skippedNoPhone = 0;

    for (const it of items) {
      const name = String(it?.name || "").trim();
      const phone = String(it?.phone || "").trim();
      if (!name || !digits(phone)) {
        skippedNoPhone++;
        continue;
      }
      const key = digits(phone);
      if (seen.has(key)) continue;
      seen.add(key);
      valid.push({ ...it, name, phone });
    }

    const existing = await FullStackContactModel.find({ phone: { $in: valid.map((v) => v.phone) } }).select("phone");
    const existingSet = new Set(existing.map((e) => digits(e.phone)));
    const toInsert = valid.filter((v) => !existingSet.has(digits(v.phone)));
    const by = (req.user as any)?.username || "Admin";

    const docs = toInsert.map((v) => ({
      name: v.name,
      phone: v.phone,
      companyName: String(v.companyName || "").trim(),
      website: String(v.website || "").trim(),
      service: String(v.service || "Web Development").trim(),
      city: String(v.city || "").trim(),
      state: String(v.state || "").trim(),
      projectDescription: String(v.projectDescription || "").trim(),
      status: "Pending",
      activityLog: [{ type: "status", from: "", to: "Pending (imported)", at: new Date(), by }],
    }));

    const created = docs.length ? await FullStackContactModel.insertMany(docs) : [];

    res.status(201).json({
      success: true,
      message: `${created.length} contact(s) imported`,
      data: {
        created: created.length,
        duplicates: valid.length - toInsert.length,
        skippedNoPhone,
      },
    });
  } catch (error) {
    next(error);
  }
});
