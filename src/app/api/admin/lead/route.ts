import { authorize } from "@/app/lib/auth";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const user=authorize(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, startDate, nextFollowUp, status, price } = await req.json();

    if (!name || !status) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const tenant = user.tenantDB;
    const db = client.db(tenant);
    const leadsCollection = db.collection("lead");

    const existingLead = await leadsCollection.findOne({ name });

    const nextFollowUpObj: any = nextFollowUp ? new Date(nextFollowUp) : null;
    if (nextFollowUp && isNaN(nextFollowUpObj.getTime())) {
      return NextResponse.json(
        { message: "Invalid nextFollowUp date format" },
        { status: 400 }
      );
    }

    if (existingLead) {
      const updateFields: any = {
        status,
        updatedAt: new Date(),
      };

      if (nextFollowUpObj) updateFields.nextFollowUp = nextFollowUpObj;
      if (price !== undefined) updateFields.price = Number(price);

      await leadsCollection.updateOne({ name }, { $set: updateFields });

      return NextResponse.json(
        { message: "Lead updated successfully" },
        { status: 200 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { message: "startDate is required when creating a new lead" },
        { status: 400 }
      );
    }

    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      return NextResponse.json(
        { message: "Invalid startDate format" },
        { status: 400 }
      );
    }

    const newLead = {
      name,
      startDate: startDateObj,
      nextFollowUp: nextFollowUpObj || null,
      status,
      price: price ? Number(price) : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await leadsCollection.insertOne(newLead);

    return NextResponse.json(
      { message: "Lead created successfully", leadId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating or updating lead:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const user=authorize(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(user.tenantDB);
    const leadsCollection = db.collection("lead");

    const leads = await leadsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ leads }, { status: 200 });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { message: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user=authorize(req);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(user.tenantDB);
    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId");
    if (!leadId) {
      return NextResponse.json(
        { message: "LeadId ID is required" },
        { status: 400 }
      );
    }
    await db.collection("lead").deleteOne({ _id: new ObjectId(leadId) });
    return NextResponse.json({ message: "leadId deleted" }, { status: 200 });
  } catch (error) {
    console.error("❌ Error deleting Lead:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
